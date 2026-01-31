# 09. Multi-Tenant Isolation & Data Safety

## Tenant Identification

**RULE: Tenant ID must be extracted early and verified. Never trust tenant ID from user input alone.**

```python
# ✅ CORRECT: Tenant from verified token
async def get_tenant_context(
    user: User = Depends(get_current_user),
    request: Request = None,
) -> TenantContext:
    """Extract and verify tenant from user's token claims."""
    
    # Tenant ID is in user's verified claims
    tenant_id = user.tenant_id
    
    if not tenant_id:
        raise HTTPException(status_code=403, detail="User not assigned to tenant")
    
    # Optional: Verify tenant still exists and is active
    tenant = await db.get_tenant(tenant_id)
    if not tenant or not tenant.is_active:
        raise HTTPException(status_code=403, detail="Tenant inactive")
    
    return TenantContext(
        tenant_id=tenant_id,
        tenant=tenant,
        user=user,
    )

@app.get("/data")
async def get_data(tenant_context: TenantContext = Depends(get_tenant_context)):
    # All data access is scoped to tenant_context.tenant_id
    data = await db.get_tenant_data(tenant_context.tenant_id)
    return data

# ❌ WRONG: Tenant from query parameter (user can change)
@app.get("/data")
async def get_data(tenant_id: str = Query(...)):
    data = await db.get_tenant_data(tenant_id)
    return data

# ❌ WRONG: Tenant from header without verification
@app.get("/data")
async def get_data(tenant_id: str = Header(...)):
    data = await db.get_tenant_data(tenant_id)
    return data
```

## Query Filtering

**RULE: Every query must include a tenant filter. Add this to the ORM layer to prevent mistakes.**

```python
# ✅ CORRECT: Query helper that enforces tenant filtering
class TenantAwareQuery:
    def __init__(self, db: AsyncSession, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id
    
    async def get_users(self):
        query = select(User).where(
            User.tenant_id == self.tenant_id,
            User.is_deleted == False,
        )
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_user_by_id(self, user_id: str):
        query = select(User).where(
            User.id == user_id,
            User.tenant_id == self.tenant_id,  # ALWAYS filter by tenant
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

@app.get("/users")
async def list_users(tenant_context: TenantContext = Depends(get_tenant_context)):
    tenant_query = TenantAwareQuery(db, tenant_context.tenant_id)
    users = await tenant_query.get_users()
    return users

# ✅ CORRECT: SQLAlchemy event listener to enforce filtering
from sqlalchemy import event

@event.listens_for(AsyncSession, "before_bulk_delete")
def receive_before_bulk_delete(mapper, connection, **kw):
    # Prevent bulk delete without explicit tenant filter
    raise RuntimeError("Bulk delete without tenant filter not allowed")

# ❌ WRONG: Forgetting tenant filter
@app.get("/users")
async def list_users():
    query = select(User)  # No tenant filter!
    result = await db.execute(query)
    return result.scalars().all()  # Returns users from ALL tenants

# ❌ WRONG: Optional tenant filter
@app.get("/users")
async def list_users(tenant_id: str = None):
    if tenant_id:
        query = select(User).where(User.tenant_id == tenant_id)
    else:
        query = select(User)  # No filter if tenant_id is None
    return await db.execute(query)
```

## Data Isolation in Databases

**RULE: Choose a multi-tenancy strategy and document it. Keep data isolation consistent.**

```python
# ✅ CORRECT: Single database, single schema, tenant column
# Every table has a tenant_id column
# Query always filters by tenant_id

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(primary_key=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    email: Mapped[str] = mapped_column(unique=False)  # Unique per tenant, not globally
    
    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="unique_tenant_email"),
    )

# ✅ CORRECT: Separate schemas per tenant (advanced)
# Schema name = "tenant_{tenant_id}"
# Simplifies RBAC—all tables in schema belong to tenant
# Requires careful connection pooling

# ❌ WRONG: Separate database per tenant (high overhead)
# Difficult to maintain; connection pooling complexity; migration burden

# ❌ WRONG: Tenant filter in Python, not database
for user in db.query(User).all():
    if user.tenant_id == tenant_id:
        results.append(user)
# Race condition; wrong result; inefficient
```

## Row-Level Security (Object-Level Permissions)

**RULE: Some resources belong to users. Verify ownership before granting access.**

```python
# ✅ CORRECT: Ownership verification
@app.get("/documents/{doc_id}")
async def get_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await db.get(Document, doc_id)
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Verify ownership AND tenant membership
    if doc.owner_id != current_user.id or doc.tenant_id != current_user.tenant_id:
        logger.warning(
            "Unauthorized access attempt",
            extra={"user_id": current_user.id, "doc_id": doc_id}
        )
        raise HTTPException(status_code=403, detail="Access denied")
    
    return doc

# ✅ CORRECT: Shared resources with explicit permissions
class DocumentShare(Base):
    __tablename__ = "document_shares"
    
    id: Mapped[str] = mapped_column(primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"))
    shared_with_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    permissions: Mapped[list[str]]  # ["read", "write", "delete"]

async def can_access_document(
    user_id: str,
    doc_id: str,
    db: AsyncSession
) -> bool:
    doc = await db.get(Document, doc_id)
    
    # Owner always has access
    if doc.owner_id == user_id:
        return True
    
    # Check if shared
    share = await db.scalar(
        select(DocumentShare).where(
            DocumentShare.document_id == doc_id,
            DocumentShare.shared_with_user_id == user_id,
        )
    )
    
    return share is not None

# ❌ WRONG: No ownership check
@app.get("/documents/{doc_id}")
async def get_document(doc_id: str):
    doc = await db.get(Document, doc_id)
    return doc  # Anyone can access any document

# ❌ WRONG: Ownership check without tenant verification
if doc.owner_id != user_id:
    raise HTTPException(status_code=403)
# User from different tenant could be owner of a document in another tenant
```
