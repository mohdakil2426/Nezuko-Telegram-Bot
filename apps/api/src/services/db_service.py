"""Business logic for database inspection and maintenance."""

import re

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.database import ColumnInfo, MigrationStatusResponse, TableDataResponse, TableInfo

logger = structlog.get_logger()

# Security: Regex to validate table names (only alphanumeric and underscores)
TABLE_NAME_PATTERN = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


def validate_table_name(table_name: str) -> str:
    """Validate table name to prevent SQL injection.

    Raises:
        ValueError: If table name contains invalid characters.
    """
    if not TABLE_NAME_PATTERN.match(table_name):
        raise ValueError(f"Invalid table name: {table_name}")
    if len(table_name) > 128:  # Reasonable max length
        raise ValueError(f"Table name too long: {table_name}")
    return table_name


class DatabaseService:
    """Service for handling database inspection and maintenance operations."""

    async def get_tables(self, session: AsyncSession) -> list[TableInfo]:
        """
        Retrieves list of tables using SQL inspection.
        Supports both PostgreSQL and SQLite.
        """
        is_sqlite = session.bind.dialect.name == "sqlite"

        if is_sqlite:
            # SQLite Implementation
            query = text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
            )
            result = await session.execute(query)
            tables = []

            for row in result:
                table_name = row.name
                # Get row count
                count_query = text(f"SELECT COUNT(*) FROM {table_name}")  # noqa: S608
                count = (await session.execute(count_query)).scalar()

                # Get columns
                col_query = text(f"PRAGMA table_info({table_name})")  # noqa: S608
                col_result = await session.execute(col_query)
                columns = [r.name for r in col_result]

                tables.append(
                    TableInfo(
                        name=table_name,
                        row_count=int(count) if count is not None else 0,
                        size_bytes=0,  # Not easily available in SQLite
                        columns=columns,
                    ),
                )
            return tables

        # PostgreSQL Implementation
        query = text("""
            SELECT
                relname as table_name,
                n_live_tup as row_count,
                pg_total_relation_size(relid) as size_bytes
            FROM pg_stat_user_tables
            ORDER BY pg_total_relation_size(relid) DESC;
        """)

        result = await session.execute(query)
        tables = []

        for row in result:
            table_name = row.table_name
            col_query = text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = :table_name",
            )
            col_result = await session.execute(col_query, {"table_name": table_name})
            columns = [r.column_name for r in col_result]

            tables.append(
                TableInfo(
                    name=table_name,
                    row_count=row.row_count,
                    size_bytes=row.size_bytes,
                    columns=columns,
                ),
            )

        return tables

    async def get_table_data(
        self,
        session: AsyncSession,
        table_name: str,
        page: int = 1,
        per_page: int = 50,
    ) -> TableDataResponse:
        """
        Fetches raw data from a table with pagination.
        Table name is validated against SQL injection patterns.
        """
        # Security: Validate table name format before use
        table_name = validate_table_name(table_name)

        is_sqlite = session.bind.dialect.name == "sqlite"

        # 1. Validate table exists
        if is_sqlite:
            check_query = text(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name = :table_name"
            )
            result = await session.execute(check_query, {"table_name": table_name})
        else:
            check_query = text(
                "SELECT 1 FROM information_schema.tables WHERE table_name = :table_name AND table_schema = 'public'",
            )
            result = await session.execute(check_query, {"table_name": table_name})

        if not result.scalar():
            raise ValueError(f"Table {table_name} does not exist")

        # 2. Get columns info
        columns = []
        if is_sqlite:
            col_query = text(f"PRAGMA table_info({table_name})")  # noqa: S608
            col_result = await session.execute(col_query)
            for r in col_result:
                # SQLite PRAGMA returns: cid, name, type, notnull, dflt_value, pk
                columns.append(
                    ColumnInfo(name=r.name, type=str(r.type), nullable=not r.notnull),
                )
        else:
            col_query = text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = :table_name
                ORDER BY ordinal_position
            """)
            col_result = await session.execute(col_query, {"table_name": table_name})
            for r in col_result:
                columns.append(
                    ColumnInfo(
                        name=r.column_name, type=r.data_type, nullable=r.is_nullable == "YES"
                    ),
                )

        # 3. Get total count
        # Use safe string formatting for table name since we validated it
        count_query = text(f"SELECT COUNT(*) FROM {table_name}")  # noqa: S608
        total_rows = (await session.execute(count_query)).scalar() or 0

        # 4. Fetch data
        offset = (page - 1) * per_page
        data_query = text(f"SELECT * FROM {table_name} LIMIT :limit OFFSET :offset")  # noqa: S608
        data_result = await session.execute(data_query, {"limit": per_page, "offset": offset})

        rows = []
        for row in data_result:
            # Convert row to dict
            row_dict = {}
            for idx, col in enumerate(columns):
                # Handle special types if needed (e.g. bytes, datetime)
                val = row[idx]
                row_dict[col.name] = val
            rows.append(row_dict)

        return TableDataResponse(
            columns=columns,
            rows=rows,
            total_rows=total_rows,
            page=page,
            per_page=per_page,
        )

    async def get_migrations(self, session: AsyncSession) -> MigrationStatusResponse:
        # This assumes alembic_version table exists and we can read it
        try:
            query = text("SELECT version_num FROM alembic_version")
            current = (await session.execute(query)).scalar()
        except Exception as exc:  # pylint: disable=broad-exception-caught
            logger.error("migration_status_failed", error=str(exc))
            current = None

        return MigrationStatusResponse(
            current_revision=current,
            history=[],  # TODO: parse alembic history if possible, or leave empty
        )


# Singleton
db_service = DatabaseService()
