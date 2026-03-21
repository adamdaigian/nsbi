import { parseDocument } from "@/engine/parser";
import type { PageSpec, QuerySpec, ChartSpec, ChartType } from "./types";
import type { SQLQueryBlock, SemanticQueryBlockDoc } from "@/types/document";

const CHART_COMPONENT_REGEX = /<(LineChart|AreaChart|BarChart|ScatterPlot|DataTable|BigValue|Sparkline|EChartsRaw)\s+([^/>]*)\/?>/g;
const GRID_REGEX = /<Grid([^>]*)>([\s\S]*?)<\/Grid>/g;
const GROUP_REGEX = /<Group([^>]*)>([\s\S]*?)<\/Group>/g;

/**
 * Parse MDX content into a PageSpec structure.
 * Best-effort: extracts what it can, preserves the rest.
 */
export function mdxToPageSpec(mdxContent: string): PageSpec {
  const parsed = parseDocument(mdxContent);

  // Convert queries
  const queries: QuerySpec[] = parsed.queries.map((q) => {
    if (q.type === "semantic") {
      const sq = q as SemanticQueryBlockDoc;
      return {
        name: sq.name,
        type: "semantic" as const,
        semantic: {
          topic: sq.topic,
          dimensions: sq.dimensions,
          measures: sq.measures,
          timeGrain: sq.timeGrain,
          filters: sq.filters as Array<{ field: string; operator: string; value: unknown }>,
          orderBy: sq.orderBy as Array<{ field: string; direction: "asc" | "desc" }>,
          limit: sq.limit,
        },
      };
    }
    const sqlQ = q as SQLQueryBlock;
    return {
      name: sqlQ.name,
      type: "sql" as const,
      sql: sqlQ.sql,
    };
  });

  // Extract chart components from MDX content
  const charts: ChartSpec[] = [];
  let chartMatch: RegExpExecArray | null;

  CHART_COMPONENT_REGEX.lastIndex = 0;
  while ((chartMatch = CHART_COMPONENT_REGEX.exec(parsed.content)) !== null) {
    const componentName = chartMatch[1] as ChartType;
    const propsStr = chartMatch[2] ?? "";

    const props = parseJSXProps(propsStr);
    const dataRef = (props.data as string) ?? "";
    delete props.data;

    charts.push({
      id: `chart_${charts.length + 1}`,
      type: componentName,
      queryRef: dataRef.replace(/"/g, ""),
      props,
      title: props.title as string | undefined,
    });
  }

  return {
    title: parsed.frontmatter.title ?? "Untitled",
    description: parsed.frontmatter.description,
    queries,
    layout: charts,
  };
}

/**
 * Parse JSX-like props from a string.
 * Handles: prop="value", prop={123}, prop={true}, prop (boolean shorthand)
 */
function parseJSXProps(propsStr: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  // Match various prop patterns
  const propRegex = /(\w+)(?:=(?:"([^"]*)"|{([^}]*)})|(?=\s|$))/g;
  let match: RegExpExecArray | null;

  while ((match = propRegex.exec(propsStr)) !== null) {
    const name = match[1]!;
    const stringVal = match[2];
    const exprVal = match[3];

    if (stringVal !== undefined) {
      props[name] = stringVal;
    } else if (exprVal !== undefined) {
      // Try to parse as number or boolean
      if (exprVal === "true") props[name] = true;
      else if (exprVal === "false") props[name] = false;
      else if (!isNaN(Number(exprVal))) props[name] = Number(exprVal);
      else props[name] = exprVal;
    } else {
      // Boolean shorthand: <Component prop />
      props[name] = true;
    }
  }

  return props;
}
