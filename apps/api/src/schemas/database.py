from typing import Any

from pydantic import BaseModel


class ColumnInfo(BaseModel):
    name: str
    type: str
    nullable: bool


class TableInfo(BaseModel):
    name: str
    row_count: int
    size_bytes: int
    columns: list[str]


class TableListResponse(BaseModel):
    tables: list[TableInfo]


class TableDataResponse(BaseModel):
    columns: list[ColumnInfo]
    rows: list[dict[str, Any]]
    total_rows: int
    page: int
    per_page: int


class MigrationInfo(BaseModel):
    revision: str
    description: str
    applied_at: str | None = None


class MigrationStatusResponse(BaseModel):
    current_revision: str | None
    history: list[MigrationInfo]
