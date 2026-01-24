import contextvars
from uuid import uuid4

_trace_id_ctx_var: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "trace_id", default=None
)


def get_trace_id() -> str:
    """Get the current trace ID or generate a new one if not set."""
    trace_id = _trace_id_ctx_var.get()
    if trace_id is None:
        trace_id = str(uuid4())
        _trace_id_ctx_var.set(trace_id)
    return trace_id


def set_trace_id(trace_id: str) -> None:
    """Set the trace ID for the current context."""
    _trace_id_ctx_var.set(trace_id)
