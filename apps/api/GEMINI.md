# API Backend Context

## Overview

FastAPI REST backend providing endpoints for the admin dashboard and bot integration.

## Tech Stack

- **Framework**: FastAPI 0.128+
- **Python**: 3.13+
- **ORM**: SQLAlchemy 2.0 (async)
- **Validation**: Pydantic V2
- **Auth**: Supabase JWT verification
- **Server**: Uvicorn

## Key Patterns

### Project Structure

```
src/
├── api/v1/
│   ├── endpoints/    # Route handlers
│   └── router.py     # Route registration
├── core/             # Config, database, security
├── models/           # SQLAlchemy models
├── schemas/          # Pydantic schemas
├── services/         # Business logic
└── middleware/       # HTTP middleware
```

### SQLAlchemy 2.0 Patterns

```python
# ✅ Use select() style queries
from sqlalchemy import select

async def get_groups(session: AsyncSession):
    result = await session.execute(
        select(ProtectedGroup).where(ProtectedGroup.is_active == True)
    )
    return result.scalars().all()

# ❌ Don't use legacy ORM style
# session.query(Model).filter_by(...)
```

### Pydantic V2 Patterns

```python
# ✅ Use model_validator (not root_validator)
from pydantic import BaseModel, model_validator

class GroupCreate(BaseModel):
    title: str
    channel_id: int

    @model_validator(mode='after')
    def validate_channel(self) -> 'GroupCreate':
        # validation logic
        return self

# ✅ Use ConfigDict (not class Config)
class GroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
```

### Async Database Operations

```python
# ✅ Always use async
async with get_session() as session:
    result = await session.execute(query)
    
# ❌ Never use sync operations
# session.execute(query)  # blocks event loop
```

### Dependency Injection

```python
from fastapi import Depends
from typing import Annotated

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    ...

CurrentUser = Annotated[User, Depends(get_current_user)]

@router.get("/groups")
async def list_groups(user: CurrentUser):
    ...
```

## Commands

```bash
uvicorn src.main:app --reload --port 8080  # Dev server
alembic upgrade head                        # Migrations
ruff check src/ --fix                       # Lint
python -m pyrefly check                     # Type check
```
