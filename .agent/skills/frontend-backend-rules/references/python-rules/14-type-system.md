# 14. Type System & Modern Typing (Python 3.13+)

## Type Annotations (Non-Negotiable)

**RULE: Every function, parameter, and return value must be annotated. No `Any` unless absolutely unavoidable.**

```python
# ✅ CORRECT: Full type annotation
from typing import Optional, Union
from pydantic import BaseModel

class User(BaseModel):
    id: str
    email: str
    tenant_id: str
    is_active: bool

async def get_user(
    user_id: str,
    db: AsyncSession,
) -> Optional[User]:
    """Get user by ID."""
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()

@app.get("/users/{user_id}", response_model=User)
async def get_user_endpoint(
    user_id: str,
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await get_user(user_id, db)
    if not user:
        raise HTTPException(status_code=404)
    return user

# ✅ CORRECT: Generic types
from typing import TypeVar, Generic, Callable, Awaitable

T = TypeVar("T")

async def retry_async(
    func: Callable[..., Awaitable[T]],
    max_attempts: int = 3,
) -> T:
    """Retry async function with exponential backoff."""
    for attempt in range(max_attempts):
        try:
            return await func()
        except Exception as e:
            if attempt == max_attempts - 1:
                raise
            await asyncio.sleep(2 ** attempt)

# ✅ CORRECT: Union types (Python 3.10+)
async def process_data(
    data: dict | list,  # Instead of Union[dict, list]
) -> str | None:
    """Process data and return result or None."""
    if isinstance(data, dict):
        return data.get("result")
    elif isinstance(data, list):
        return str(len(data))
    return None

# ❌ WRONG: Missing type annotation
def get_user(user_id):  # No type hints
    return db.query(User).get(user_id)

# ❌ WRONG: Using Any (hides errors)
async def process(data: Any) -> Any:
    return data.some_method()  # No type checking

# ❌ WRONG: Incomplete annotation
def create_user(email: str, password: str):  # No return type
    return User(email=email)
```

## TypedDict for Structured Dictionaries

**RULE: Use `TypedDict` instead of `dict` for structured data. Better IDE support and type checking.**

```python
# ✅ CORRECT: TypedDict
from typing import TypedDict

class UserData(TypedDict):
    id: str
    email: str
    tenant_id: str

async def fetch_user_data(user_id: str) -> UserData:
    result = await db.get_user(user_id)
    return {
        "id": result.id,
        "email": result.email,
        "tenant_id": result.tenant_id,
    }

# ✅ CORRECT: Required vs optional keys
class PartialUserData(TypedDict, total=False):
    id: str
    email: str
    updated_at: str  # Optional

# ❌ WRONG: Untyped dict
async def fetch_user_data(user_id: str) -> dict:
    return {
        "id": user_id,
        "email": "...",
    }
```

## Pydantic for Validation

**RULE: Use Pydantic models for request/response validation. Not Optional—required for production.**

```python
# ✅ CORRECT: Pydantic model
from pydantic import BaseModel, Field, EmailStr, validator

class UserCreate(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=12, description="User password")
    name: str = Field(..., min_length=1, max_length=100)
    
    @validator("password")
    def password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain uppercase letter")
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "MyPassword123!",
                "name": "John Doe",
            }
        }

@app.post("/users", response_model=User)
async def create_user(user_create: UserCreate, db: AsyncSession = Depends(get_db)):
    # UserCreate is validated automatically
    if await db.user_exists(user_create.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(**user_create.dict())
    db.add(user)
    await db.commit()
    return user

# ❌ WRONG: No Pydantic validation
@app.post("/users")
async def create_user(data: dict):
    # No validation—user could send wrong types
    user = User(**data)
    db.add(user)
    await db.commit()
```

## TypeVar with Default Values (Python 3.13+)

**RULE: Use TypeVar default values for more flexible generic programming.**

```python
# ✅ CORRECT: TypeVar with default (Python 3.13+)
from typing import TypeVar

T = TypeVar("T", default=str)  # Defaults to str if not specified

class Container(Generic[T]):
    def __init__(self, value: T | None = None) -> None:
        self.value = value

# Container() is Container[str] by default
# Container[int]() is Container[int]
```

## Deprecated Decorator (Python 3.13+)

**RULE: Use `@warnings.deprecated` to mark deprecated APIs.**

```python
# ✅ CORRECT: Mark deprecated functions
import warnings

@warnings.deprecated("Use get_user_async() instead")
def get_user_sync(user_id: str) -> User:
    """Deprecated: Use async version."""
    return database.get_user(user_id)

@warnings.deprecated(
    "Use NewService instead",
    category=DeprecationWarning,
)
class OldService:
    pass
```
