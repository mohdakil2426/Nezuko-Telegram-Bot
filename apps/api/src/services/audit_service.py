"""Business logic for audit log management."""

import uuid
from collections.abc import Sequence
from datetime import datetime
from typing import Any

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from src.models.admin_audit_log import AdminAuditLog


class AuditService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_log(
        self,
        action: str,
        resource_type: str,
        user_id: uuid.UUID | None = None,
        resource_id: str | None = None,
        old_value: dict[str, Any] | None = None,
        new_value: dict[str, Any] | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AdminAuditLog:
        """Create a new audit log entry."""
        log_entry = AdminAuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.session.add(log_entry)
        await self.session.commit()
        await self.session.refresh(log_entry)
        return log_entry

    async def get_logs(
        self,
        page: int = 1,
        per_page: int = 20,
        user_id: uuid.UUID | None = None,
        action: str | None = None,
        resource_type: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> tuple[Sequence[AdminAuditLog], int]:
        """Get paginated audit logs with filters."""
        query = select(AdminAuditLog).options(joinedload(AdminAuditLog.user))

        if user_id:
            query = query.where(AdminAuditLog.user_id == user_id)
        if action:
            query = query.where(AdminAuditLog.action == action)
        if resource_type:
            query = query.where(AdminAuditLog.resource_type == resource_type)
        if start_date:
            query = query.where(AdminAuditLog.created_at >= start_date)
        if end_date:
            query = query.where(AdminAuditLog.created_at <= end_date)

        # Count total
        count_q = select(func.count()).select_from(AdminAuditLog)

        if user_id:
            count_q = count_q.where(AdminAuditLog.user_id == user_id)
        if action:
            count_q = count_q.where(AdminAuditLog.action == action)
        if resource_type:
            count_q = count_q.where(AdminAuditLog.resource_type == resource_type)
        if start_date:
            count_q = count_q.where(AdminAuditLog.created_at >= start_date)
        if end_date:
            count_q = count_q.where(AdminAuditLog.created_at <= end_date)

        count_result = await self.session.execute(count_q)
        total = count_result.scalar() or 0

        # Apply ordering and pagination to the main query
        query = query.order_by(desc(AdminAuditLog.created_at))
        query = query.offset((page - 1) * per_page).limit(per_page)

        result = await self.session.execute(query)
        logs = result.scalars().all()

        return logs, total
