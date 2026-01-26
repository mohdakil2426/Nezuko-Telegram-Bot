"""Database model for application logs."""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class AdminLog(Base):
    """
    AdminLog model represents application logs stored in Postgres.
    Replaces Firebase Realtime Database logging.
    """

    __tablename__ = "admin_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
        nullable=False,
    )
    level: Mapped[str] = mapped_column(String(10), nullable=False)
    logger: Mapped[str] = mapped_column(String(100), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    module: Mapped[str] = mapped_column(String(100), nullable=True)
    function: Mapped[str] = mapped_column(String(100), nullable=True)
    line_no: Mapped[int] = mapped_column(Integer, nullable=True)
    path: Mapped[str] = mapped_column(String(255), nullable=True)
