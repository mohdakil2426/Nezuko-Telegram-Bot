import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.database import ColumnInfo, MigrationStatusResponse, TableDataResponse, TableInfo

logger = logging.getLogger(__name__)


class DatabaseService:
    async def get_tables(self, session: AsyncSession) -> list[TableInfo]:
        """
        Retrieves list of tables using SQL inspection.
        Note: Standard SQLAlchemy inspector is sync, so we run it in a run_sync block within session?
        Actually, for asyncpg we might need raw queries for size and row counts efficiently.
        """

        # We'll use raw SQL for Postgres to get sizes and row estimates
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

        # To get columns, we might need a separate query or inspector
        # Let's do a basic column fetch for each table or just return names for now
        # For simplicity and performance, we'll fetch columns via information_schema

        for row in result:
            table_name = row.table_name
            # simplified column fetch
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
        WARNING: Vulnerable to SQL injection if table_name is not sanitized.
        We must validate table_name against information_schema first.
        """

        # 1. Validate table exists
        check_query = text(
            "SELECT 1 FROM information_schema.tables WHERE table_name = :table_name AND table_schema = 'public'",
        )
        result = await session.execute(check_query, {"table_name": table_name})
        if not result.scalar():
            raise ValueError(f"Table {table_name} does not exist")

        # 2. Get columns info
        col_query = text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = :table_name
            ORDER BY ordinal_position
        """)
        col_result = await session.execute(col_query, {"table_name": table_name})
        columns = []
        for r in col_result:
            columns.append(
                ColumnInfo(name=r.column_name, type=r.data_type, nullable=r.is_nullable == "YES"),
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
        except Exception:
            current = None

        return MigrationStatusResponse(
            current_revision=current,
            history=[],  # TODO: parse alembic history if possible, or leave empty
        )


# Singleton
db_service = DatabaseService()
