"""Database model mixins for common functionality."""

from datetime import UTC, datetime

from sqlalchemy import DateTime
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column


class SoftDeleteMixin:
    """Mixin for soft delete functionality.

    Provides soft delete capabilities to models, allowing records to be marked
    as deleted without actually removing them from the database. This enables
    data retention policies and audit trails.

    Attributes:
        deleted_at: Timestamp when the record was soft-deleted (None if active).

    Properties:
        is_deleted: Returns True if the record is soft-deleted.

    Methods:
        soft_delete: Mark the record as deleted.
        restore: Restore a soft-deleted record.

    Example:
        class MyModel(Base, SoftDeleteMixin):
            __tablename__ = "my_table"
            id: Mapped[int] = mapped_column(Integer, primary_key=True)

        # Usage
        record = session.get(MyModel, 1)
        record.soft_delete()  # Mark as deleted
        assert record.is_deleted is True

        record.restore()  # Restore the record
        assert record.is_deleted is False
    """

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    @hybrid_property
    def is_deleted(self) -> bool:
        """Check if the record is soft-deleted.

        Returns:
            True if deleted_at is set, False otherwise.
        """
        return self.deleted_at is not None

    def soft_delete(self) -> None:
        """Mark the record as deleted.

        Sets deleted_at to the current UTC timestamp. Does not remove the
        record from the database.
        """
        self.deleted_at = datetime.now(UTC)

    def restore(self) -> None:
        """Restore a soft-deleted record.

        Clears the deleted_at timestamp, making the record active again.
        """
        self.deleted_at = None
