import type { AggregateType, CompilerWarning } from "../types";
import type { ResolvedContext, ResolvedMeasure } from "./resolver";
import type { DialectAdapter } from "./dialects";
import { compilerError } from "./errors";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AggregationContext {
  dimensionSelectExprs: string[];
  measureSelectExprs: string[];
  groupByExprs: string[];
  warnings: CompilerWarning[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function qualifyExpression(alias: string, expr: string, dialect: DialectAdapter): string {
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expr)) {
    return `${dialect.quoteIdentifier(alias)}.${dialect.quoteIdentifier(expr)}`;
  }
  return expr;
}

function wrapAggregate(
  expr: string,
  aggregateType: AggregateType,
  filterSql: string | null,
  dialect: DialectAdapter,
  measuresByName: Map<string, ResolvedMeasure>,
  expanding: Set<string>,
): string {
  const filteredExpr = filterSql
    ? `CASE WHEN ${filterSql} THEN ${expr} END`
    : expr;

  switch (aggregateType) {
    case "SUM":
      return `SUM(${filteredExpr})`;
    case "AVG":
      return `AVG(${filteredExpr})`;
    case "COUNT":
      return filteredExpr === "*" || expr === "*"
        ? (filterSql ? `COUNT(CASE WHEN ${filterSql} THEN 1 END)` : "COUNT(*)")
        : `COUNT(${filteredExpr})`;
    case "COUNT_DISTINCT":
      return `COUNT(DISTINCT ${filteredExpr})`;
    case "MIN":
      return `MIN(${filteredExpr})`;
    case "MAX":
      return `MAX(${filteredExpr})`;
    case "MEDIAN":
      return dialect.medianExpr(filteredExpr);
    case "DERIVED":
      return expandDerived(expr, filterSql, dialect, measuresByName, expanding);
    default:
      return `SUM(${filteredExpr})`;
  }
}

function expandDerived(
  expr: string,
  _filterSql: string | null,
  dialect: DialectAdapter,
  measuresByName: Map<string, ResolvedMeasure>,
  expanding: Set<string>,
): string {
  return expr.replace(/\$\{(\w+(?:\.\w+)?)\}/g, (_match, refName: string) => {
    if (expanding.has(refName)) {
      compilerError("CIRCULAR_DEPENDENCY", {
        message: `Circular reference detected: measure "${refName}" references itself`,
        details: { chain: [...expanding, refName] },
      });
    }

    const refMeasure = measuresByName.get(refName);
    if (!refMeasure) {
      compilerError("INVALID_FIELD", {
        message: `Derived measure references unknown measure "${refName}"`,
        details: {
          field: refName,
          availableFields: [...measuresByName.keys()],
        },
      });
    }

    expanding.add(refName);
    const qualifiedExpr = qualifyExpression(
      refMeasure.viewName,
      refMeasure.measure.sqlExpression,
      dialect,
    );
    const result = wrapAggregate(
      qualifiedExpr,
      refMeasure.measure.aggregateType,
      refMeasure.measure.filterSql ?? null,
      dialect,
      measuresByName,
      expanding,
    );
    expanding.delete(refName);
    return result;
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function buildAggregations(
  resolved: ResolvedContext,
  dialect: DialectAdapter,
): AggregationContext {
  const warnings: CompilerWarning[] = [];
  const hasDimensions = resolved.resolvedDimensions.length > 0;
  const hasMeasures = resolved.resolvedMeasures.length > 0;

  const measuresByName = new Map<string, ResolvedMeasure>();
  for (const rm of resolved.resolvedMeasures) {
    measuresByName.set(rm.fieldName, rm);
    measuresByName.set(`${rm.viewName}.${rm.fieldName}`, rm);
  }

  // Dimensions
  const dimensionSelectExprs: string[] = [];
  for (const rd of resolved.resolvedDimensions) {
    const expr = qualifyExpression(rd.viewName, rd.dimension.sqlExpression, dialect);
    dimensionSelectExprs.push(`${expr} AS ${dialect.quoteIdentifier(rd.alias)}`);
  }

  // Measures
  const measureSelectExprs: string[] = [];
  for (const rm of resolved.resolvedMeasures) {
    const expr = qualifyExpression(rm.viewName, rm.measure.sqlExpression, dialect);
    const aggregated = wrapAggregate(
      expr,
      rm.measure.aggregateType,
      rm.measure.filterSql ?? null,
      dialect,
      measuresByName,
      new Set(),
    );
    measureSelectExprs.push(`${aggregated} AS ${dialect.quoteIdentifier(rm.alias)}`);

    if (rm.measure.isSemiAdditive) {
      const hasTimeDimInGroupBy = resolved.resolvedDimensions.some(
        (rd) => rd.dimension.isTimeDimension,
      );
      if (!hasTimeDimInGroupBy) {
        warnings.push({
          code: "FANOUT_RISK",
          message: `Measure "${rm.fieldName}" is semi-additive but no time dimension is in GROUP BY`,
          severity: "warning",
        });
      }
    }
  }

  // GROUP BY
  const groupByExprs: string[] = [];
  if (hasMeasures && hasDimensions) {
    for (let i = 0; i < resolved.resolvedDimensions.length; i++) {
      groupByExprs.push(String(i + 1));
    }
  }

  return {
    dimensionSelectExprs,
    measureSelectExprs,
    groupByExprs,
    warnings,
  };
}
