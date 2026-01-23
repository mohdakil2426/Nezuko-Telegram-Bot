"""
Resilience patterns for GMBot v2.0.

Provides:
- Circuit breaker for database operations
- Enhanced exponential backoff
- Graceful degradation patterns
- Retry decorators
"""

import asyncio
import logging
import time
from typing import Callable, Optional, Any
from functools import wraps
from enum import Enum
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing recovery


@dataclass
class CircuitBreaker:
    """
    Circuit breaker for protecting against cascading failures.
    
    States:
    - CLOSED: Normal operation, requests pass through
    - OPEN: Too many failures, requests rejected immediately
    - HALF_OPEN: Testing if service recovered after cooldown
    
    Usage:
        db_circuit = CircuitBreaker(name="database", failure_threshold=3)
        
        async def query_database():
            if db_circuit.can_execute():
                try:
                    result = await do_query()
                    db_circuit.record_success()
                    return result
                except Exception as e:
                    db_circuit.record_failure()
                    raise
            else:
                raise CircuitBreakerOpenError("Database circuit open")
    """
    name: str
    failure_threshold: int = 3        # Failures before opening circuit
    recovery_timeout: float = 30.0    # Seconds before trying half-open
    success_threshold: int = 2        # Successes needed to close from half-open
    
    # Internal state
    state: CircuitState = field(default=CircuitState.CLOSED, init=False)
    failure_count: int = field(default=0, init=False)
    success_count: int = field(default=0, init=False)
    last_failure_time: float = field(default=0, init=False)
    
    def can_execute(self) -> bool:
        """Check if request should be allowed through."""
        if self.state == CircuitState.CLOSED:
            return True
        
        if self.state == CircuitState.OPEN:
            # Check if recovery timeout has passed
            if time.time() - self.last_failure_time >= self.recovery_timeout:
                self._transition_to(CircuitState.HALF_OPEN)
                return True
            return False
        
        # HALF_OPEN: Allow limited requests to test
        return True
    
    def record_success(self):
        """Record a successful operation."""
        self.failure_count = 0
        
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self._transition_to(CircuitState.CLOSED)
        elif self.state == CircuitState.OPEN:
            # Shouldn't happen, but reset if it does
            self._transition_to(CircuitState.CLOSED)
    
    def record_failure(self):
        """Record a failed operation."""
        self.failure_count += 1
        self.last_failure_time = time.time()
        self.success_count = 0
        
        if self.state == CircuitState.HALF_OPEN:
            # Single failure in half-open reopens circuit
            self._transition_to(CircuitState.OPEN)
        elif self.failure_count >= self.failure_threshold:
            self._transition_to(CircuitState.OPEN)
    
    def _transition_to(self, new_state: CircuitState):
        """Transition to a new circuit state."""
        if self.state != new_state:
            old_state = self.state
            self.state = new_state
            self.success_count = 0
            
            if new_state == CircuitState.OPEN:
                logger.warning(
                    f"🔴 Circuit breaker '{self.name}' OPENED "
                    f"(failures: {self.failure_count}, threshold: {self.failure_threshold})"
                )
            elif new_state == CircuitState.HALF_OPEN:
                logger.info(f"🟡 Circuit breaker '{self.name}' HALF-OPEN (testing recovery)")
            elif new_state == CircuitState.CLOSED:
                logger.info(f"🟢 Circuit breaker '{self.name}' CLOSED (recovered)")
    
    def get_status(self) -> dict:
        """Get circuit breaker status for monitoring."""
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "last_failure": self.last_failure_time,
            "recovery_timeout": self.recovery_timeout
        }


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open and request rejected."""
    pass


# Global circuit breakers
_database_circuit = CircuitBreaker(name="database", failure_threshold=3, recovery_timeout=30.0)
_telegram_circuit = CircuitBreaker(name="telegram", failure_threshold=5, recovery_timeout=60.0)


def get_database_circuit() -> CircuitBreaker:
    """Get the database circuit breaker."""
    return _database_circuit


def get_telegram_circuit() -> CircuitBreaker:
    """Get the Telegram API circuit breaker."""
    return _telegram_circuit


# ====================
# Retry Patterns
# ====================

def exponential_backoff(
    attempt: int,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    jitter: bool = True
) -> float:
    """
    Calculate exponential backoff delay with optional jitter.
    
    Args:
        attempt: Attempt number (1-indexed)
        base_delay: Base delay in seconds
        max_delay: Maximum delay cap
        jitter: Add random jitter to prevent thundering herd
    
    Returns:
        Delay in seconds
    """
    import random
    
    delay = min(base_delay * (2 ** (attempt - 1)), max_delay)
    
    if jitter:
        # Add ±25% jitter
        jitter_amount = delay * 0.25
        delay += random.uniform(-jitter_amount, jitter_amount)
    
    return max(0, delay)


def async_retry(
    max_attempts: int = 3,
    exceptions: tuple = (Exception,),
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    on_retry: Optional[Callable] = None
):
    """
    Decorator for async functions with retry logic.
    
    Args:
        max_attempts: Maximum retry attempts
        exceptions: Exception types to catch and retry
        base_delay: Base delay for exponential backoff
        max_delay: Maximum delay between retries
        on_retry: Optional callback called on each retry
    
    Usage:
        @async_retry(max_attempts=3, exceptions=(DatabaseError,))
        async def query_database():
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(1, max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    if attempt < max_attempts:
                        delay = exponential_backoff(attempt, base_delay, max_delay)
                        
                        logger.warning(
                            f"Retry {attempt}/{max_attempts} for {func.__name__}: {e}. "
                            f"Waiting {delay:.2f}s"
                        )
                        
                        if on_retry:
                            on_retry(attempt, e)
                        
                        await asyncio.sleep(delay)
                    else:
                        logger.error(
                            f"All {max_attempts} attempts failed for {func.__name__}: {e}"
                        )
            
            raise last_exception
        
        return wrapper
    return decorator


def circuit_protected(circuit: CircuitBreaker):
    """
    Decorator to protect async function with circuit breaker.
    
    Usage:
        @circuit_protected(get_database_circuit())
        async def query_database():
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if not circuit.can_execute():
                raise CircuitBreakerOpenError(
                    f"Circuit '{circuit.name}' is OPEN. "
                    f"Request rejected to prevent cascade failure."
                )
            
            try:
                result = await func(*args, **kwargs)
                circuit.record_success()
                return result
            except Exception as e:
                circuit.record_failure()
                raise
        
        return wrapper
    return decorator


# ====================
# Graceful Degradation
# ====================

async def with_fallback(
    primary: Callable,
    fallback: Callable,
    *args,
    **kwargs
) -> Any:
    """
    Execute primary function, fall back to secondary on failure.
    
    Args:
        primary: Primary async function to try
        fallback: Fallback async function if primary fails
        *args, **kwargs: Arguments passed to both functions
    
    Usage:
        result = await with_fallback(
            lambda: fetch_from_redis(key),
            lambda: fetch_from_database(key),
            user_id=123
        )
    """
    try:
        return await primary(*args, **kwargs)
    except Exception as e:
        logger.warning(f"Primary operation failed ({e}), using fallback")
        return await fallback(*args, **kwargs)


# ====================
# Health Tracking
# ====================

def get_all_circuit_status() -> dict:
    """Get status of all circuit breakers."""
    return {
        "database": _database_circuit.get_status(),
        "telegram": _telegram_circuit.get_status()
    }


def reset_all_circuits():
    """Reset all circuit breakers to closed state (for testing)."""
    global _database_circuit, _telegram_circuit
    
    _database_circuit = CircuitBreaker(name="database", failure_threshold=3, recovery_timeout=30.0)
    _telegram_circuit = CircuitBreaker(name="telegram", failure_threshold=5, recovery_timeout=60.0)
    
    logger.info("All circuit breakers reset")
