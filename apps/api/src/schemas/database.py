from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class ColumnInfo(BaseModel):
    name: str
    type: str
    nullable: bool


class TableInfo(BaseModel):
    name: str
    row_count: int
    size_bytes: int
    columns: List[str]


class TableListResponse(BaseModel):
    tables: List[TableInfo]


class TableDataResponse(BaseModel):
    columns: List[ColumnInfo]
    rows: List[Dict[str, Any]]
    total_rows: int
    page: int
    per_page: int


class MigrationInfo(BaseModel):
    revision: str
    description: str
    applied_at: Optional[str] = None


class MigrationStatusResponse(BaseModel):
    current_revision: Optional[str]
    history: List[MigrationInfo]
