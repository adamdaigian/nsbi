// ─── Schema Metadata Types ──────────────────────────────────────────────────

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
}

export interface TableSchema {
  name: string;
  columns: TableColumn[];
  rowCount: number;
  source: string;
}

export interface SchemaMetadata {
  tables: TableSchema[];
  lastRefreshed: string;
}
