import { createHash } from "crypto";
import type {
  SemanticQuery,
  CompiledQuery,
  JoinEdge,
  CompilerWarning,
  Filter,
  FilterOperator,
  SemanticModel,
} from "../types";
import { getDialect } from "./dialects";
import type { DialectAdapter, QueryParts } from "./dialects";
import { resolve } from "./resolver";
import type { ResolvedContext } from "./resolver";
import { planJoins } from "./joins";
import type { JoinPlanEdge } from "./joins";
import { buildAggregations } from "./aggregations";
import type { AggregationContext } from "./aggregations";
import { buildTimeContext, buildComparisonCTE } from "./time";
import type { TimeContext } from "./time";

// ─── Compiler Context (in-memory model, no DB) ──────────────────────────────

export interface CompilerContext {
  model: SemanticModel;
}

// ─── Filter → SQL ────────────────────────────────────────────────────────────

function filterToSQL(
  filter: Filter,
  resolved: ResolvedContext,
  dialect: DialectAdapter,
): string {
  const ref = filter.field;
  let viewName: string;
  let sqlExpr: string;

  if (ref.includes(".")) {
    const [vName, fName] = [ref.slice(0, ref.indexOf(".")), ref.slice(ref.indexOf(".") + 1)];
    viewName = vName!;
    const view = resolved.viewsByName.get(viewName);
    if (view) {
      const dim = view.dimensions.find((d) => d.name === fName);
      const meas = view.measures.find((m) => m.name === fName);
      sqlExpr = dim?.sqlExpression ?? meas?.sqlExpression ?? fName!;
    } else {
      sqlExpr = fName!;
    }
  } else {
    const matchedDim = resolved.resolvedDimensions.find((rd) => rd.fieldName === ref);
    const matchedMeas = resolved.resolvedMeasures.find((rm) => rm.fieldName === ref);
    if (matchedDim) {
      viewName = matchedDim.viewName;
      sqlExpr = matchedDim.dimension.sqlExpression;
    } else if (matchedMeas) {
      viewName = matchedMeas.viewName;
      sqlExpr = matchedMeas.measure.sqlExpression;
    } else {
      viewName = resolved.baseView.name;
      const dim = resolved.baseView.dimensions.find((d) => d.name === ref);
      const meas = resolved.baseView.measures.find((m) => m.name === ref);
      sqlExpr = dim?.sqlExpression ?? meas?.sqlExpression ?? ref;
    }
  }

  viewName ??= resolved.baseView.name;
  const qualifiedExpr = qualifyExpression(viewName, sqlExpr, dialect);
  return operatorToSQL(qualifiedExpr, filter.operator, filter.value);
}

function qualifyExpression(alias: string, expr: string, dialect: DialectAdapter): string {
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expr)) {
    return `${dialect.quoteIdentifier(alias)}.${dialect.quoteIdentifier(expr)}`;
  }
  return expr;
}

function operatorToSQL(expr: string, op: FilterOperator, value: unknown): string {
  switch (op) {
    case "eq":
      return `${expr} = ${sqlLiteral(value)}`;
    case "neq":
      return `${expr} != ${sqlLiteral(value)}`;
    case "gt":
      return `${expr} > ${sqlLiteral(value)}`;
    case "gte":
      return `${expr} >= ${sqlLiteral(value)}`;
    case "lt":
      return `${expr} < ${sqlLiteral(value)}`;
    case "lte":
      return `${expr} <= ${sqlLiteral(value)}`;
    case "in": {
      const vals = Array.isArray(value) ? value : [value];
      return `${expr} IN (${vals.map(sqlLiteral).join(", ")})`;
    }
    case "not_in": {
      const vals = Array.isArray(value) ? value : [value];
      return `${expr} NOT IN (${vals.map(sqlLiteral).join(", ")})`;
    }
    case "contains":
      return `${expr} LIKE ${sqlLiteral(`%${String(value)}%`)}`;
    case "not_contains":
      return `${expr} NOT LIKE ${sqlLiteral(`%${String(value)}%`)}`;
    case "is_null":
      return `${expr} IS NULL`;
    case "is_not_null":
      return `${expr} IS NOT NULL`;
    default:
      return `${expr} = ${sqlLiteral(value)}`;
  }
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  const escaped = str.replace(/'/g, "''");
  return `'${escaped}'`;
}

// ─── Join → SQL ──────────────────────────────────────────────────────────────

function joinEdgeToSQL(
  edge: JoinPlanEdge,
  resolved: ResolvedContext,
  dialect: DialectAdapter,
): string {
  const rel = edge.relationship;
  const toView = resolved.viewsById.get(edge.toViewId);
  if (!toView) return "";

  const toSource = toView.sourceType === "query"
    ? `(${toView.sourceQuery}) AS ${dialect.quoteIdentifier(toView.name)}`
    : `${dialect.tableRef(toView.sourceTable!)} AS ${dialect.quoteIdentifier(toView.name)}`;

  const conditions = rel.joinConditions.map((jc) => {
    const leftView = resolved.viewsById.get(edge.reversed ? rel.toViewId : rel.fromViewId);
    const rightView = resolved.viewsById.get(edge.reversed ? rel.fromViewId : rel.toViewId);
    const leftAlias = leftView?.name ?? "";
    const rightAlias = rightView?.name ?? "";

    if (edge.reversed) {
      return `${dialect.quoteIdentifier(leftAlias)}.${dialect.quoteIdentifier(jc.rightColumn)} = ${dialect.quoteIdentifier(rightAlias)}.${dialect.quoteIdentifier(jc.leftColumn)}`;
    }
    return `${dialect.quoteIdentifier(leftAlias)}.${dialect.quoteIdentifier(jc.leftColumn)} = ${dialect.quoteIdentifier(rightAlias)}.${dialect.quoteIdentifier(jc.rightColumn)}`;
  });

  return `${edge.joinType} JOIN ${toSource} ON ${conditions.join(" AND ")}`;
}

// ─── SQL assembly ────────────────────────────────────────────────────────────

function generateSQL(
  resolved: ResolvedContext,
  joinPlan: { edges: JoinPlanEdge[] },
  aggregation: AggregationContext,
  timeCtx: TimeContext,
  query: SemanticQuery,
  dialect: DialectAdapter,
): string {
  const selectExprs: string[] = [];

  for (let i = 0; i < resolved.resolvedDimensions.length; i++) {
    const rd = resolved.resolvedDimensions[i]!;
    const isTimeDim = resolved.timeDimension && rd.alias === resolved.timeDimension.alias;

    if (isTimeDim && timeCtx.timeDimExpr) {
      selectExprs.push(`${timeCtx.timeDimExpr} AS ${dialect.quoteIdentifier(rd.alias)}`);
    } else {
      selectExprs.push(aggregation.dimensionSelectExprs[i]!);
    }
  }

  selectExprs.push(...aggregation.measureSelectExprs);

  const isDimensionsOnly = resolved.resolvedMeasures.length === 0 && resolved.resolvedDimensions.length > 0;

  const baseView = resolved.baseView;
  const fromClause = baseView.sourceType === "query"
    ? `(${baseView.sourceQuery}) AS ${dialect.quoteIdentifier(baseView.name)}`
    : `${dialect.tableRef(baseView.sourceTable!)} AS ${dialect.quoteIdentifier(baseView.name)}`;

  const joinClauses = joinPlan.edges.map((edge) => joinEdgeToSQL(edge, resolved, dialect));

  const whereExprs: string[] = [...timeCtx.whereExprs];
  const havingExprs: string[] = [];
  for (const filter of query.filters) {
    const isMeasureFilter = resolved.resolvedMeasures.some(
      (rm) => rm.fieldName === filter.field || `${rm.viewName}.${rm.fieldName}` === filter.field,
    );
    const sql = filterToSQL(filter, resolved, dialect);
    if (isMeasureFilter && aggregation.groupByExprs.length > 0) {
      havingExprs.push(sql);
    } else {
      whereExprs.push(sql);
    }
  }

  const groupByExprs = [...aggregation.groupByExprs];

  const orderByExprs: string[] = [];
  if (query.orderBy) {
    for (const ob of query.orderBy) {
      const dimMatch = resolved.resolvedDimensions.find(
        (rd) => rd.fieldName === ob.field || `${rd.viewName}.${rd.fieldName}` === ob.field,
      );
      const measMatch = resolved.resolvedMeasures.find(
        (rm) => rm.fieldName === ob.field || `${rm.viewName}.${rm.fieldName}` === ob.field,
      );
      const alias = dimMatch?.alias ?? measMatch?.alias ?? ob.field;
      orderByExprs.push(`${dialect.quoteIdentifier(alias)} ${ob.direction.toUpperCase()}`);
    }
  }

  const parts: QueryParts = {
    select: isDimensionsOnly ? selectExprs.map((s) => `DISTINCT ${s}`) : selectExprs,
    from: fromClause,
    joins: joinClauses,
    where: whereExprs,
    groupBy: isDimensionsOnly ? [] : groupByExprs,
    having: havingExprs,
    orderBy: orderByExprs,
    limit: query.limit,
  };

  let sql = dialect.assembleQuery(parts);

  if (query.comparison && resolved.timeDimension && resolved.resolvedMeasures.length > 0) {
    const measureAliases = resolved.resolvedMeasures.map((rm) => rm.alias);
    const { cte } = buildComparisonCTE(
      sql,
      resolved.timeDimension.alias,
      measureAliases,
      query.comparison,
      dialect,
    );
    sql = cte;
  }

  return sql;
}

// ─── Cache key ───────────────────────────────────────────────────────────────

function generateCacheKey(query: SemanticQuery): string {
  const canonical = {
    topicId: query.topicId,
    dimensions: [...query.dimensions].sort(),
    measures: [...query.measures].sort(),
    filters: [...query.filters].sort((a, b) => a.field.localeCompare(b.field)),
    timeGrain: query.timeGrain ?? null,
    dateRange: query.dateRange ?? null,
    comparison: query.comparison ?? null,
    orderBy: query.orderBy ?? [],
    limit: query.limit ?? null,
    dialect: "duckdb",
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

// ─── Pipeline orchestrator ───────────────────────────────────────────────────

export function compile(
  query: SemanticQuery,
  ctx: CompilerContext,
): CompiledQuery {
  // 1. Resolve entities + fields
  const resolved = resolve(query, ctx.model);

  // 2. Get DuckDB dialect
  const dialect = getDialect();

  // 3. Plan joins
  const joinPlan = planJoins(resolved);

  // 4. Build aggregations
  const aggregation = buildAggregations(resolved, dialect);

  // 5. Build time context
  const timeCtx = buildTimeContext(resolved, query, dialect);

  // 6. Generate SQL
  const sql = generateSQL(resolved, joinPlan, aggregation, timeCtx, query, dialect);

  // 7. Collect warnings
  const warnings: CompilerWarning[] = [
    ...resolved.warnings,
    ...joinPlan.warnings,
    ...aggregation.warnings,
    ...timeCtx.warnings,
  ];

  // 8. Build join path
  const joinPath: JoinEdge[] = joinPlan.edges.map((e) => ({
    from: e.fromViewId,
    to: e.toViewId,
    type: e.joinType,
    cardinality: e.cardinality,
  }));

  // 9. Cache key
  const cacheKey = generateCacheKey(query);

  return {
    sql,
    dialect: "duckdb",
    parameters: {},
    joinPath,
    warnings,
    cacheKey,
  };
}
