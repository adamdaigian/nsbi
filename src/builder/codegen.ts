import type { PageSpec, QuerySpec, ChartSpec, LayoutSpec } from "./types";
import { isChartSpec } from "./types";

/**
 * Convert a structured PageSpec to formatted MDX with frontmatter, query blocks, and chart JSX.
 */
export function pageSpecToMDX(spec: PageSpec): string {
  const parts: string[] = [];

  // Frontmatter
  parts.push("---");
  parts.push(`title: ${spec.title}`);
  if (spec.description) {
    parts.push(`description: ${spec.description}`);
  }
  parts.push("---");
  parts.push("");

  // Query blocks
  for (const query of spec.queries) {
    if (query.type === "sql" && query.sql) {
      parts.push("```sql");
      parts.push(`-- name: ${query.name}`);
      parts.push(query.sql);
      parts.push("```");
      parts.push("");
    } else if (query.type === "semantic" && query.semantic) {
      parts.push("```semantic");
      parts.push(`name: ${query.name}`);
      parts.push(`topic: ${query.semantic.topic}`);
      if (query.semantic.dimensions.length > 0) {
        parts.push("dimensions:");
        for (const dim of query.semantic.dimensions) {
          parts.push(`  - ${dim}`);
        }
      }
      if (query.semantic.measures.length > 0) {
        parts.push("measures:");
        for (const meas of query.semantic.measures) {
          parts.push(`  - ${meas}`);
        }
      }
      if (query.semantic.timeGrain) {
        parts.push(`timeGrain: ${query.semantic.timeGrain}`);
      }
      if (query.semantic.limit) {
        parts.push(`limit: ${query.semantic.limit}`);
      }
      parts.push("```");
      parts.push("");
    }
  }

  // Layout items
  for (const item of spec.layout) {
    parts.push(renderLayoutItem(item, 0));
    parts.push("");
  }

  return parts.join("\n").trim() + "\n";
}

function renderLayoutItem(item: LayoutSpec | ChartSpec, indent: number): string {
  const pad = "  ".repeat(indent);

  if (isChartSpec(item)) {
    return renderChart(item, indent);
  }

  if ("type" in item) {
    switch (item.type) {
      case "grid": {
        const colsProp = item.props.cols ? ` cols={${item.props.cols}}` : "";
        const gapProp = item.props.gap ? ` gap={${item.props.gap}}` : "";
        const children = item.children.map((c) => renderLayoutItem(c, indent + 1)).join("\n");
        return `${pad}<Grid${colsProp}${gapProp}>\n${children}\n${pad}</Grid>`;
      }
      case "group": {
        const titleProp = item.props.title ? ` title="${item.props.title}"` : "";
        const children = item.children.map((c) => renderLayoutItem(c, indent + 1)).join("\n");
        return `${pad}<Group${titleProp}>\n${children}\n${pad}</Group>`;
      }
      case "tabs": {
        const tabItems = item.children as Array<{
          label: string;
          value: string;
          content: Array<LayoutSpec | ChartSpec>;
        }>;
        const triggers = tabItems
          .map((t) => `    <TabsTrigger value="${t.value}">${t.label}</TabsTrigger>`)
          .join("\n");
        const contents = tabItems
          .map((t) => {
            const inner = t.content.map((c) => renderLayoutItem(c, indent + 2)).join("\n");
            return `  <TabsContent value="${t.value}">\n${inner}\n  </TabsContent>`;
          })
          .join("\n");
        return `${pad}<Tabs>\n  <TabsList>\n${triggers}\n  </TabsList>\n${contents}\n${pad}</Tabs>`;
      }
    }
  }

  return "";
}

function renderChart(chart: ChartSpec, indent: number): string {
  const pad = "  ".repeat(indent);
  const props = [`data="${chart.queryRef}"`];

  for (const [key, value] of Object.entries(chart.props)) {
    if (value === true) {
      props.push(key);
    } else if (typeof value === "string") {
      props.push(`${key}="${value}"`);
    } else if (typeof value === "number") {
      props.push(`${key}={${value}}`);
    }
  }

  const propsStr = props.join(" ");

  if (chart.title) {
    return `${pad}<${chart.type} ${propsStr} title="${chart.title}" />`;
  }
  return `${pad}<${chart.type} ${propsStr} />`;
}
