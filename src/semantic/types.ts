import { z } from "zod";

// ─── Time Grain ──────────────────────────────────────────────────────────────

export type TimeGrain = "HOUR" | "DAY" | "WEEK" | "MONTH" | "QUARTER" | "YEAR";

// ─── Aggregate Types ─────────────────────────────────────────────────────────

export type AggregateType =
  | "SUM"
  | "AVG"
  | "COUNT"
  | "COUNT_DISTINCT"
  | "MIN"
  | "MAX"
  | "MEDIAN"
  | "DERIVED";

// ─── Cardinality & Join Types ────────────────────────────────────────────────

export type CardinalityType = "one-to-one" | "many-to-one" | "one-to-many" | "many-to-many";
export type JoinType = "LEFT" | "RIGHT" | "INNER" | "FULL";

// ─── Filter Types ────────────────────────────────────────────────────────────

export type FilterOperator =
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
  | "in" | "not_in" | "contains" | "not_contains"
  | "is_null" | "is_not_null";

export interface Filter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export type DateFilterExpression =
  | { type: "relative"; amount: number; unit: string }
  | { type: "absolute"; start: string; end: string }
  | { type: "shortcut"; shortcut: string };

// ─── Compiler Warning & Error ────────────────────────────────────────────────

export type CompilerErrorCode =
  | "INVALID_TOPIC"
  | "INVALID_FIELD"
  | "FANOUT_BLOCKED"
  | "AMBIGUOUS_JOIN_PATH"
  | "NO_JOIN_PATH"
  | "CIRCULAR_DEPENDENCY"
  | "INVALID_FILTER"
  | "UNSUPPORTED_DIALECT";

export interface CompilerWarning {
  code: string;
  message: string;
  severity: "warning" | "info";
}

// ─── Semantic Model (in-memory, loaded from YAML) ───────────────────────────

export interface SemanticDimension {
  id: string;
  name: string;
  label?: string;
  type: string;
  sqlExpression: string;
  isTimeDimension: boolean;
  description?: string;
}

export interface SemanticMeasure {
  id: string;
  name: string;
  label?: string;
  sqlExpression: string;
  aggregateType: AggregateType;
  format?: string;
  filterSql?: string;
  isSemiAdditive?: boolean;
  description?: string;
}

export interface SemanticView {
  id: string;
  name: string;
  label?: string;
  description?: string;
  sourceTable?: string;
  sourceType: "table" | "query";
  sourceQuery?: string;
  dimensions: SemanticDimension[];
  measures: SemanticMeasure[];
  status?: "active" | "draft" | "deprecated";
}

export interface JoinCondition {
  leftColumn: string;
  rightColumn: string;
}

export interface SemanticRelationship {
  id: string;
  name: string;
  fromViewId: string;
  toViewId: string;
  cardinality: CardinalityType;
  joinType: JoinType;
  joinConditions: JoinCondition[];
}

export interface AllowedJoin {
  relationshipId: string;
  fanoutAllowed?: boolean;
}

export interface SemanticTopic {
  id: string;
  name: string;
  label?: string;
  description?: string;
  baseViewId: string;
  allowedJoins: AllowedJoin[];
  visibleFields: string[];
  defaultTimeDimension?: string;
  defaultTimeGrain?: TimeGrain;
  joinPolicy: "strict" | "permissive";
  fanoutAllowlist: string[];
  sampleQuestions: string[];
}

export interface SemanticModel {
  views: Map<string, SemanticView>;
  relationships: SemanticRelationship[];
  topics: Map<string, SemanticTopic>;
}

// ─── Semantic Query (from MDX semantic blocks) ──────────────────────────────

export interface SemanticQuery {
  topicId: string;
  dimensions: string[];
  measures: string[];
  filters: Filter[];
  timeGrain?: TimeGrain;
  dateRange?: DateFilterExpression;
  comparison?: DateFilterExpression;
  orderBy?: { field: string; direction: "asc" | "desc" }[];
  limit?: number;
}

// ─── Compiled Query ──────────────────────────────────────────────────────────

export interface JoinEdge {
  from: string;
  to: string;
  type: JoinType;
  cardinality: CardinalityType;
}

export interface CompiledQuery {
  sql: string;
  dialect: string;
  parameters: Record<string, unknown>;
  joinPath: JoinEdge[];
  warnings: CompilerWarning[];
  cacheKey: string;
}

// ─── YAML Validation Schemas ─────────────────────────────────────────────────

export const yamlDimensionSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  type: z.string().default("STRING"),
  sql: z.string(),
  timeDimension: z.boolean().default(false),
  description: z.string().optional(),
});

export const yamlMeasureSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  sql: z.string(),
  aggregate: z.enum(["SUM", "AVG", "COUNT", "COUNT_DISTINCT", "MIN", "MAX", "MEDIAN", "DERIVED"]).default("SUM"),
  format: z.string().optional(),
  filter: z.string().optional(),
  semiAdditive: z.boolean().default(false),
  description: z.string().optional(),
});

export const yamlViewSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  description: z.string().optional(),
  source: z.union([
    z.object({ table: z.string() }),
    z.object({ sql: z.string() }),
  ]),
  dimensions: z.array(yamlDimensionSchema).default([]),
  measures: z.array(yamlMeasureSchema).default([]),
});

export const yamlJoinConditionSchema = z.object({
  left: z.string(),
  right: z.string(),
});

export const yamlRelationshipSchema = z.object({
  name: z.string(),
  from: z.string(),
  to: z.string(),
  cardinality: z.enum(["one-to-one", "many-to-one", "one-to-many", "many-to-many"]).default("many-to-one"),
  joinType: z.enum(["LEFT", "RIGHT", "INNER", "FULL"]).default("LEFT"),
  on: z.array(yamlJoinConditionSchema),
});

export const yamlRelationshipsFileSchema = z.object({
  relationships: z.array(yamlRelationshipSchema).default([]),
});

export const yamlTopicSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  description: z.string().optional(),
  baseView: z.string(),
  allowedJoins: z.array(z.union([
    z.string(),
    z.object({ relationship: z.string(), fanoutAllowed: z.boolean().optional() }),
  ])).default([]),
  visibleFields: z.array(z.string()).default([]),
  defaultTimeDimension: z.string().optional(),
  defaultTimeGrain: z.enum(["HOUR", "DAY", "WEEK", "MONTH", "QUARTER", "YEAR"]).optional(),
  sampleQuestions: z.array(z.string()).default([]),
});

export const yamlTopicsFileSchema = z.object({
  topics: z.array(yamlTopicSchema).default([]),
});

// ─── Semantic Query Block (for MDX parser) ───────────────────────────────────

export const semanticQueryBlockSchema = z.object({
  name: z.string(),
  topic: z.string(),
  dimensions: z.array(z.string()).default([]),
  measures: z.array(z.string()).default([]),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "not_in", "contains", "not_contains", "is_null", "is_not_null"]),
    value: z.unknown(),
  })).default([]),
  timeGrain: z.enum(["HOUR", "DAY", "WEEK", "MONTH", "QUARTER", "YEAR"]).optional(),
  dateRange: z.union([
    z.object({ type: z.literal("relative"), amount: z.number(), unit: z.string() }),
    z.object({ type: z.literal("absolute"), start: z.string(), end: z.string() }),
    z.object({ type: z.literal("shortcut"), shortcut: z.string() }),
  ]).optional(),
  orderBy: z.array(z.object({
    field: z.string(),
    direction: z.enum(["asc", "desc"]).default("asc"),
  })).optional(),
  limit: z.number().optional(),
});

export type SemanticQueryBlock = z.infer<typeof semanticQueryBlockSchema>;
