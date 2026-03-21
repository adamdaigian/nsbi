import { z } from "zod";

// ─── Document Frontmatter ────────────────────────────────────────────────────

export const documentFrontmatterSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  refreshSchedule: z.string().optional(),
});

export type DocumentFrontmatter = z.infer<typeof documentFrontmatterSchema>;

// ─── Query Blocks ────────────────────────────────────────────────────────────

export const sqlQueryBlockSchema = z.object({
  name: z.string(),
  type: z.literal("sql"),
  sql: z.string(),
  filterVariables: z.array(z.string()).optional(),
});

export type SQLQueryBlock = z.infer<typeof sqlQueryBlockSchema>;

// ─── Semantic Query Blocks ──────────────────────────────────────────────────

export const semanticQueryBlockDocSchema = z.object({
  name: z.string(),
  type: z.literal("semantic"),
  topic: z.string(),
  dimensions: z.array(z.string()).default([]),
  measures: z.array(z.string()).default([]),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.unknown(),
  })).default([]),
  timeGrain: z.string().optional(),
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

export type SemanticQueryBlockDoc = z.infer<typeof semanticQueryBlockDocSchema>;

// ─── Union Query Block ──────────────────────────────────────────────────────

export type QueryBlock = SQLQueryBlock | SemanticQueryBlockDoc;

// ─── Parsed Document ─────────────────────────────────────────────────────────

export interface ParsedDocument {
  frontmatter: DocumentFrontmatter;
  queries: QueryBlock[];
  content: string; // MDX content with frontmatter and query blocks stripped
  errors: DocumentParseError[];
}

export interface DocumentParseError {
  type: "frontmatter" | "query" | "content";
  message: string;
  line?: number;
}

// ─── Chart Types ─────────────────────────────────────────────────────────────

export type FormatString =
  | "usd0"
  | "usd2"
  | "pct"
  | "pct0"
  | "num0"
  | "num2"
  | "date"
  | "datetime"
  | "string";

// ─── Query Result ────────────────────────────────────────────────────────────

export interface QueryResult {
  rows: Record<string, unknown>[];
  columns: { name: string; type: string }[];
  loading: boolean;
  error: string | null;
}
