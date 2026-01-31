# 18. Clean Architecture & Separation of Concerns

## Layer Structure

**RULE: Separate concerns into layers: API → Service → Repository → Database.**

```python
# ✅ CORRECT: Layered architecture

# Layer 1: API (FastAPI routes)
@app.post("/users")
async def create_user_endpoint(
    user_data: UserCreate,
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
):
    """API endpoint for creating user."""
    result = await service.create_user(user_data, current_user.tenant_id)
    return {"id": result.id}

# Layer 2: Service (business logic)
class UserService:
    def __init__(self, repo: UserRepository):
        self.repo = repo
    
    async def create_user(self, data: UserCreate, tenant_id: str) -> User:
        """Create user with business logic."""
        
        # Business rules
        if await self.repo.email_exists(data.email, tenant_id):
            raise ValidationError("Email already exists")
        
        user = User(
            email=data.email,
            tenant_id=tenant_id,
            is_active=True,
        )
        
        # Persist
        created = await self.repo.create(user)
        
        # Side effects
        await self.repo.log_action("user_created", created.id)
        
        return created

# Layer 3: Repository (data access)
class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create(self, user: User) -> User:
        """Create user in database."""
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user
    
    async def email_exists(self, email: str, tenant_id: str) -> bool:
        """Check if email exists."""
        result = await self.db.scalar(
            select(exists(select(User).where(
                User.email == email,
                User.tenant_id == tenant_id,
            )))
        )
        return result

# Layer 4: Database (SQLAlchemy models)
class User(Base):
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(primary_key=True)
    email: Mapped[str]
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"))
    is_active: Mapped[bool] = mapped_column(default=True)

# ❌ WRONG: Business logic in API endpoint
@app.post("/users")
async def create_user(user_data: dict, db: AsyncSession = Depends(get_db)):
    if await db.scalar(select(exists(select(User).where(User.email == user_data["email"])))):
        raise HTTPException(status_code=400)
    
    user = User(**user_data)
    db.add(user)
    await db.commit()
    return {"id": user.id}
    # Hard to test, reuse, or maintain
```

## Dependency Injection

**RULE: Use dependency injection. Don't import services directly. Enables testing and loose coupling.**

```python
# ✅ CORRECT: Dependency injection
@lru_cache(maxsize=1)
def get_user_service() -> UserService:
    repo = UserRepository(AsyncSessionLocal())
    return UserService(repo)

@app.post("/users")
async def create_user(
    user_data: UserCreate,
    service: UserService = Depends(get_user_service),
):
    return await service.create_user(user_data)

# ✅ CORRECT: Override for testing
def test_create_user():
    mock_repo = mock.AsyncMock()
    mock_service = UserService(mock_repo)
    
    app.dependency_overrides[get_user_service] = lambda: mock_service
    
    # Test with mocked service

# ❌ WRONG: Direct import
from app.services import user_service

@app.post("/users")
async def create_user(user_data: UserCreate):
    return await user_service.create_user(user_data)
    # Can't mock for testing
```
