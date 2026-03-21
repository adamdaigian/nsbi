import yaml from "js-yaml";
import {
  documentFrontmatterSchema,
  sqlQueryBlockSchema,
  semanticQueryBlockDocSchema,
  type ParsedDocument,
  type SQLQueryBlock,
  type SemanticQueryBlockDoc,
  type QueryBlock,
  type DocumentFrontmatter,
  type DocumentParseError,
} from "@/types/document";

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---/;
const CODE_BLOCK_REGEX = /```sql\s*\n([\s\S]*?)```/g;
const SEMANTIC_BLOCK_REGEX = /```semantic\s*\n([\s\S]*?)```/g;
const TEMPLATE_VAR_REGEX = /\$\{(\w+)\}/g;

/**
 * Parse a document's content to extract frontmatter, SQL query blocks, and MDX content.
 */
export function parseDocument(content: string): ParsedDocument {
  const errors: DocumentParseError[] = [];

  const frontmatter = extractFrontmatter(content, errors);
  const sqlQueries = extractQueryBlocks(content, errors);
  const semanticQueries = extractSemanticBlocks(content, errors);

  const queries: QueryBlock[] = [...sqlQueries, ...semanticQueries];

  // Strip frontmatter and query blocks from content for MDX rendering
  const mdxContent = content
    .replace(FRONTMATTER_REGEX, "")
    .replace(/```sql\s*\n([\s\S]*?)```/g, "")
    .replace(/```semantic\s*\n([\s\S]*?)```/g, "")
    .trim();

  return {
    frontmatter,
    queries,
    content: mdxContent,
    errors,
  };
}

function extractFrontmatter(
  content: string,
  errors: DocumentParseError[],
): DocumentFrontmatter {
  const match = FRONTMATTER_REGEX.exec(content);
  if (!match?.[1]) {
    return {};
  }

  try {
    const raw = yaml.load(match[1]);
    if (typeof raw !== "object" || raw === null) {
      return {};
    }
    const parsed = documentFrontmatterSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({
        type: "frontmatter",
        message: `Invalid frontmatter: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
      });
      return raw as DocumentFrontmatter;
    }
    return parsed.data;
  } catch (e) {
    errors.push({
      type: "frontmatter",
      message: `YAML parse error: ${e instanceof Error ? e.message : String(e)}`,
    });
    return {};
  }
}

function extractQueryBlocks(
  content: string,
  errors: DocumentParseError[],
): SQLQueryBlock[] {
  const blocks: SQLQueryBlock[] = [];
  let match: RegExpExecArray | null;

  CODE_BLOCK_REGEX.lastIndex = 0;

  while ((match = CODE_BLOCK_REGEX.exec(content)) !== null) {
    const blockContent = match[1]!;
    const line = content.substring(0, match.index).split("\n").length;

    // SQL blocks: first line is `-- name: <name>`, rest is SQL
    const lines = blockContent.trim().split("\n");
    const nameMatch = lines[0]?.match(/^--\s*name:\s*(.+)$/);
    if (nameMatch) {
      const sql = lines.slice(1).join("\n").trim();
      const filterVariables = extractFilterVariables(sql);
      const parsed = sqlQueryBlockSchema.safeParse({
        name: nameMatch[1]!.trim(),
        type: "sql",
        sql,
        filterVariables: filterVariables.length > 0 ? filterVariables : undefined,
      });
      if (parsed.success) {
        blocks.push(parsed.data);
      } else {
        errors.push({
          type: "query",
          message: `Invalid SQL block: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
          line,
        });
      }
    } else {
      const sql = blockContent.trim();
      const filterVariables = extractFilterVariables(sql);
      blocks.push({
        name: `query_${blocks.length + 1}`,
        type: "sql",
        sql,
        filterVariables: filterVariables.length > 0 ? filterVariables : undefined,
      });
    }
  }

  return blocks;
}

/**
 * Extract ```semantic blocks from content.
 * Each block contains YAML defining a semantic query.
 */
function extractSemanticBlocks(
  content: string,
  errors: DocumentParseError[],
): SemanticQueryBlockDoc[] {
  const blocks: SemanticQueryBlockDoc[] = [];
  let match: RegExpExecArray | null;

  SEMANTIC_BLOCK_REGEX.lastIndex = 0;

  while ((match = SEMANTIC_BLOCK_REGEX.exec(content)) !== null) {
    const blockContent = match[1]!;
    const line = content.substring(0, match.index).split("\n").length;

    try {
      const raw = yaml.load(blockContent);
      if (typeof raw !== "object" || raw === null) {
        errors.push({
          type: "query",
          message: "Semantic block must contain valid YAML",
          line,
        });
        continue;
      }

      const parsed = semanticQueryBlockDocSchema.safeParse({
        ...(raw as Record<string, unknown>),
        type: "semantic",
      });

      if (parsed.success) {
        blocks.push(parsed.data);
      } else {
        errors.push({
          type: "query",
          message: `Invalid semantic block: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
          line,
        });
      }
    } catch (e) {
      errors.push({
        type: "query",
        message: `Semantic block YAML error: ${e instanceof Error ? e.message : String(e)}`,
        line,
      });
    }
  }

  return blocks;
}

/**
 * Extract ${variable} template references from a SQL string.
 */
function extractFilterVariables(sql: string): string[] {
  const vars = new Set<string>();
  let match: RegExpExecArray | null;
  TEMPLATE_VAR_REGEX.lastIndex = 0;
  while ((match = TEMPLATE_VAR_REGEX.exec(sql)) !== null) {
    vars.add(match[1]!);
  }
  return Array.from(vars);
}

/**
 * Interpolate ${variable} placeholders in SQL with filter values.
 * Escapes string values to prevent SQL injection.
 */
export function interpolateSQL(
  sql: string,
  filters: Record<string, unknown>,
): string {
  return sql.replace(TEMPLATE_VAR_REGEX, (_match, varName: string) => {
    const value = filters[varName];
    if (value === undefined || value === null) return "NULL";
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    if (value instanceof Date) return `'${value.toISOString().split("T")[0]}'`;
    // String values: escape single quotes
    return `'${String(value).replace(/'/g, "''")}'`;
  });
}
