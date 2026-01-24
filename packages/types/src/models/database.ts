export interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
}

export interface TableInfo {
    name: string;
    row_count: number;
    size_bytes: number;
    columns: string[];
}

export interface TableListResponse {
    tables: TableInfo[];
}

export interface TableDataResponse {
    columns: ColumnInfo[];
    rows: Record<string, any>[];
    total_rows: number;
    page: number;
    per_page: number;
}

export interface MigrationInfo {
    revision: string;
    description: string;
    applied_at: string | null;
}

export interface MigrationStatusResponse {
    current_revision: string | null;
    history: MigrationInfo[];
}
