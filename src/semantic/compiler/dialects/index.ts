import type { TimeGrain } from "../../types";
import { DuckDBDialect } from "./duckdb";

export interface QueryParts {
  select: string[];
  from: string;
  joins: string[];
  where: string[];
  groupBy: string[];
  having: string[];
  orderBy: string[];
  limit?: number;
}

export interface DialectAdapter {
  readonly name: string;
  quoteIdentifier(name: string): string;
  tableRef(sourceTable: string): string;
  currentDate(): string;
  dateAdd(col: string, n: number, unit: string): string;
  dateSub(col: string, n: number, unit: string): string;
  dateTrunc(col: string, grain: TimeGrain): string;
  startOfPeriod(grain: string): string;
  endOfPeriod(grain: string): string;
  medianExpr(expr: string): string;
  assembleQuery(parts: QueryParts): string;
}

export function getDialect(): DialectAdapter {
  return new DuckDBDialect();
}
