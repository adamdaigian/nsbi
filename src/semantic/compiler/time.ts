import type {
  DateFilterExpression,
  CompilerWarning,
  SemanticQuery,
} from "../types";
import type { ResolvedContext } from "./resolver";
import type { DialectAdapter } from "./dialects";
import { compilerError } from "./errors";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TimeContext {
  whereExprs: string[];
  timeDimExpr: string | null;
  comparisonCTE: string | null;
  comparisonSelectExprs: string[];
  warnings: CompilerWarning[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function qualifyExpression(alias: string, expr: string, dialect: DialectAdapter): string {
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expr)) {
    return `${dialect.quoteIdentifier(alias)}.${dialect.quoteIdentifier(expr)}`;
  }
  return expr;
}

function dateFilterToWhere(
  timeDimExpr: string,
  filter: DateFilterExpression,
  dialect: DialectAdapter,
): string[] {
  switch (filter.type) {
    case "relative": {
      const unit = filter.unit.toUpperCase();
      const start = dialect.dateSub(dialect.currentDate(), filter.amount, unit);
      return [
        `${timeDimExpr} >= ${start}`,
        `${timeDimExpr} < ${dialect.currentDate()}`,
      ];
    }
    case "absolute": {
      return [
        `${timeDimExpr} >= '${filter.start}'`,
        `${timeDimExpr} <= '${filter.end}'`,
      ];
    }
    case "shortcut": {
      return shortcutToWhere(timeDimExpr, filter.shortcut, dialect);
    }
  }
}

function shortcutToWhere(
  expr: string,
  shortcut: string,
  dialect: DialectAdapter,
): string[] {
  const cur = dialect.currentDate();

  switch (shortcut) {
    case "today":
      return [`${expr} = ${cur}`];
    case "yesterday":
      return [`${expr} = ${dialect.dateSub(cur, 1, "DAY")}`];
    case "this_week":
      return [
        `${expr} >= ${dialect.startOfPeriod("WEEK")}`,
        `${expr} < ${dialect.endOfPeriod("WEEK")}`,
      ];
    case "last_week":
      return [
        `${expr} >= ${dialect.dateSub(dialect.startOfPeriod("WEEK"), 7, "DAY")}`,
        `${expr} < ${dialect.startOfPeriod("WEEK")}`,
      ];
    case "this_month":
      return [
        `${expr} >= ${dialect.startOfPeriod("MONTH")}`,
        `${expr} < ${dialect.endOfPeriod("MONTH")}`,
      ];
    case "last_month":
      return [
        `${expr} >= ${dialect.dateSub(dialect.startOfPeriod("MONTH"), 1, "MONTH")}`,
        `${expr} < ${dialect.startOfPeriod("MONTH")}`,
      ];
    case "this_quarter":
      return [
        `${expr} >= ${dialect.startOfPeriod("QUARTER")}`,
        `${expr} < ${dialect.endOfPeriod("QUARTER")}`,
      ];
    case "last_quarter":
      return [
        `${expr} >= ${dialect.dateSub(dialect.startOfPeriod("QUARTER"), 1, "QUARTER")}`,
        `${expr} < ${dialect.startOfPeriod("QUARTER")}`,
      ];
    case "this_year":
      return [
        `${expr} >= ${dialect.startOfPeriod("YEAR")}`,
        `${expr} < ${dialect.endOfPeriod("YEAR")}`,
      ];
    case "last_year":
      return [
        `${expr} >= ${dialect.dateSub(dialect.startOfPeriod("YEAR"), 1, "YEAR")}`,
        `${expr} < ${dialect.startOfPeriod("YEAR")}`,
      ];
    default:
      compilerError("INVALID_FILTER", {
        message: `Unknown date shortcut: "${shortcut}". Valid: today, yesterday, this_week, last_week, this_month, last_month, this_quarter, last_quarter, this_year, last_year`,
        details: { shortcut },
      });
  }
}

// ─── Period-over-period comparison ───────────────────────────────────────────

export function buildComparisonCTE(
  baseSQL: string,
  timeDimAlias: string,
  measureAliases: string[],
  _comparison: DateFilterExpression,
  dialect: DialectAdapter,
): { cte: string; selectExprs: string[] } {
  const selectExprs: string[] = [];
  const lagExprs: string[] = [];

  for (const mAlias of measureAliases) {
    const prevAlias = `${mAlias}__previous`;
    const changeAlias = `${mAlias}__change_pct`;

    lagExprs.push(
      `LAG(${dialect.quoteIdentifier(mAlias)}) OVER (ORDER BY ${dialect.quoteIdentifier(timeDimAlias)}) AS ${dialect.quoteIdentifier(prevAlias)}`,
    );
    lagExprs.push(
      `CASE WHEN LAG(${dialect.quoteIdentifier(mAlias)}) OVER (ORDER BY ${dialect.quoteIdentifier(timeDimAlias)}) != 0 ` +
      `THEN ROUND((${dialect.quoteIdentifier(mAlias)} - LAG(${dialect.quoteIdentifier(mAlias)}) OVER (ORDER BY ${dialect.quoteIdentifier(timeDimAlias)})) ` +
      `* 100.0 / LAG(${dialect.quoteIdentifier(mAlias)}) OVER (ORDER BY ${dialect.quoteIdentifier(timeDimAlias)}), 2) ` +
      `ELSE NULL END AS ${dialect.quoteIdentifier(changeAlias)}`,
    );

    selectExprs.push(prevAlias, changeAlias);
  }

  const cte = `WITH base_query AS (\n${baseSQL}\n)\nSELECT base_query.*,\n  ${lagExprs.join(",\n  ")}\nFROM base_query`;

  return { cte, selectExprs };
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function buildTimeContext(
  resolved: ResolvedContext,
  query: SemanticQuery,
  dialect: DialectAdapter,
): TimeContext {
  const warnings: CompilerWarning[] = [];
  const whereExprs: string[] = [];
  let timeDimExpr: string | null = null;
  const comparisonCTE: string | null = null;
  const comparisonSelectExprs: string[] = [];

  const timeDim = resolved.timeDimension;
  if (!timeDim) {
    if (query.dateRange) {
      warnings.push({
        code: "FANOUT_RISK",
        message: "dateRange specified but no time dimension found — date filter ignored",
        severity: "warning",
      });
    }
    return { whereExprs, timeDimExpr, comparisonCTE, comparisonSelectExprs, warnings };
  }

  const rawTimeDimExpr = qualifyExpression(
    timeDim.viewName,
    timeDim.dimension.sqlExpression,
    dialect,
  );

  if (query.timeGrain) {
    timeDimExpr = dialect.dateTrunc(rawTimeDimExpr, query.timeGrain);
  }

  if (query.dateRange) {
    const filterExprs = dateFilterToWhere(rawTimeDimExpr, query.dateRange, dialect);
    whereExprs.push(...filterExprs);
  }

  return { whereExprs, timeDimExpr, comparisonCTE, comparisonSelectExprs, warnings };
}
