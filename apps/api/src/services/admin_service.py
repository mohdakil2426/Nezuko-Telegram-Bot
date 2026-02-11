"""Business logic for admin user management."""

from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.admin_user import AdminUser
from src.schemas.admin import AdminCreateRequest, AdminUpdateRequest


class AdminServiceError(Exception):
    """Base exception for admin service errors."""


class AdminAlreadyExistsError(AdminServiceError):
    """Raised when admin email already exists."""


class AdminNotFoundError(AdminServiceError):
    """Raised when admin is not found."""


class AdminService:
    """Service for managing admin users.

    All methods raise domain exceptions, not HTTP exceptions.
    HTTP mapping is done in the endpoint layer.
    """

    def __init__(self, session: AsyncSession) -> None:
        """Initialize with database session.

        Args:
            session: SQLAlchemy async session.
        """
        self.session = session

    async def get_admins(self) -> Sequence[AdminUser]:
        """Get all admin users.

        Returns:
            Sequence of AdminUser objects.
        """
        result = await self.session.execute(select(AdminUser))
        return result.scalars().all()

    async def get_admin(self, admin_id: UUID) -> AdminUser | None:
        """Get admin by ID.

        Args:
            admin_id: Admin UUID.

        Returns:
            AdminUser or None if not found.
        """
        return await self.session.get(AdminUser, admin_id)

    async def get_admin_by_email(self, email: str) -> AdminUser | None:
        """Get admin by email.

        Args:
            email: Admin email address.

        Returns:
            AdminUser or None if not found.
        """
        result = await self.session.execute(select(AdminUser).where(AdminUser.email == email))
        return result.scalar_one_or_none()

    async def create_admin(self, data: AdminCreateRequest) -> AdminUser:
        """Create a new admin user.

        Args:
            data: Admin creation data.

        Returns:
            Created AdminUser.

        Raises:
            AdminAlreadyExistsError: If admin email already exists.
        """
        existing = await self.get_admin_by_email(data.email)
        if existing:
            raise AdminAlreadyExistsError(f"Admin with email {data.email} already exists")

        # Creates user in local DB.
        admin = AdminUser(
            email=data.email,
            full_name=data.full_name,
            role=data.role,
            telegram_id=data.telegram_id,
            is_active=data.is_active,
        )
        self.session.add(admin)
        await self.session.commit()
        await self.session.refresh(admin)
        return admin

    async def update_admin(self, admin_id: UUID, data: AdminUpdateRequest) -> AdminUser:
        """Update an existing admin user.

        Args:
            admin_id: Admin UUID to update.
            data: Fields to update.

        Returns:
            Updated AdminUser.

        Raises:
            AdminNotFoundError: If admin not found.
        """
        admin = await self.get_admin(admin_id)
        if not admin:
            raise AdminNotFoundError(f"Admin with ID {admin_id} not found")

        updated_data = data.model_dump(exclude_unset=True)
        # Password updates are not supported (Telegram handles auth)
        updated_data.pop("password", None)

        for field, value in updated_data.items():
            setattr(admin, field, value)

        await self.session.commit()
        await self.session.refresh(admin)
        return admin

    async def delete_admin(self, admin_id: UUID) -> bool:
        """Delete an admin user.

        Args:
            admin_id: Admin UUID to delete.

        Returns:
            True if deleted.

        Raises:
            AdminNotFoundError: If admin not found.
        """
        admin = await self.get_admin(admin_id)
        if not admin:
            raise AdminNotFoundError(f"Admin with ID {admin_id} not found")

        await self.session.delete(admin)
        await self.session.commit()
        return True
