import type { TimeGrain } from "../../types";
import type { DialectAdapter, QueryParts } from "./index";

export class DuckDBDialect implements DialectAdapter {
  readonly name = "duckdb" as const;

  quoteIdentifier(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
  }

  tableRef(sourceTable: string): string {
    return `"${sourceTable.replace(/"/g, '""')}"`;
  }

  currentDate(): string {
    return "CURRENT_DATE";
  }

  dateAdd(col: string, n: number, unit: string): string {
    return `(${col} + INTERVAL '${n}' ${unit})`;
  }

  dateSub(col: string, n: number, unit: string): string {
    return `(${col} - INTERVAL '${n}' ${unit})`;
  }

  dateTrunc(col: string, grain: TimeGrain): string {
    return `DATE_TRUNC('${grain.toLowerCase()}', ${col})`;
  }

  startOfPeriod(grain: string): string {
    return `DATE_TRUNC('${grain.toLowerCase()}', ${this.currentDate()})`;
  }

  endOfPeriod(grain: string): string {
    return `(DATE_TRUNC('${grain.toLowerCase()}', ${this.currentDate()}) + INTERVAL '1' ${grain})`;
  }

  medianExpr(expr: string): string {
    return `MEDIAN(${expr})`;
  }

  assembleQuery(parts: QueryParts): string {
    const lines: string[] = [];
    lines.push(`SELECT\n  ${parts.select.join(",\n  ")}`);
    lines.push(`FROM ${parts.from}`);
    for (const join of parts.joins) {
      lines.push(join);
    }
    if (parts.where.length > 0) {
      lines.push(`WHERE ${parts.where.join("\n  AND ")}`);
    }
    if (parts.groupBy.length > 0) {
      lines.push(`GROUP BY ${parts.groupBy.join(", ")}`);
    }
    if (parts.having.length > 0) {
      lines.push(`HAVING ${parts.having.join("\n  AND ")}`);
    }
    if (parts.orderBy.length > 0) {
      lines.push(`ORDER BY ${parts.orderBy.join(", ")}`);
    }
    if (parts.limit != null) {
      lines.push(`LIMIT ${parts.limit}`);
    }
    return lines.join("\n");
  }
}
