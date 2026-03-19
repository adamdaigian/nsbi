import * as vscode from "vscode";

interface ComponentSchema {
  name: string;
  description: string;
  props: { name: string; type: string; required?: boolean; description: string }[];
}

/**
 * Static schema of all nsbi components and their props.
 */
const COMPONENT_SCHEMAS: ComponentSchema[] = [
  {
    name: "LineChart",
    description: "Line chart with optional multi-series and dual-axis support",
    props: [
      { name: "data", type: "string", required: true, description: "Query name or data array" },
      { name: "x", type: "string", required: true, description: "Column for x-axis" },
      { name: "y", type: "string", required: true, description: "Column for y-axis" },
      { name: "series", type: "string", description: "Column to split into multiple lines" },
      { name: "smooth", type: "boolean", description: "Smooth line interpolation" },
      { name: "xFmt", type: "string", description: "X-axis format (month, num0, usd0, pct0)" },
      { name: "yFmt", type: "string", description: "Y-axis format" },
      { name: "y2", type: "string", description: "Column for secondary y-axis" },
      { name: "title", type: "string", description: "Chart title" },
      { name: "subtitle", type: "string", description: "Chart subtitle" },
      { name: "height", type: "number", description: "Chart height in pixels (default: 400)" },
    ],
  },
  {
    name: "BarChart",
    description: "Bar chart with horizontal, stacked, and sorted variants",
    props: [
      { name: "data", type: "string", required: true, description: "Query name or data array" },
      { name: "x", type: "string", required: true, description: "Column for categories" },
      { name: "y", type: "string", required: true, description: "Column for values" },
      { name: "series", type: "string", description: "Column to split into grouped bars" },
      { name: "horizontal", type: "boolean", description: "Horizontal bar chart" },
      { name: "stacked", type: "boolean", description: "Stack bars" },
      { name: "sort", type: '"asc" | "desc"', description: "Sort bars by value" },
      { name: "labels", type: "boolean", description: "Show value labels on bars" },
      { name: "xFmt", type: "string", description: "X-axis format" },
      { name: "yFmt", type: "string", description: "Y-axis format" },
      { name: "title", type: "string", description: "Chart title" },
      { name: "subtitle", type: "string", description: "Chart subtitle" },
      { name: "height", type: "number", description: "Chart height in pixels" },
    ],
  },
  {
    name: "AreaChart",
    description: "Area chart with optional stacking and fill opacity",
    props: [
      { name: "data", type: "string", required: true, description: "Query name or data array" },
      { name: "x", type: "string", required: true, description: "Column for x-axis" },
      { name: "y", type: "string", required: true, description: "Column for y-axis" },
      { name: "series", type: "string", description: "Column to split into multiple areas" },
      { name: "smooth", type: "boolean", description: "Smooth line interpolation" },
      { name: "stacked", type: "boolean", description: "Stack areas" },
      { name: "fillOpacity", type: "number", description: "Fill opacity (0-1, default: 0.3)" },
      { name: "xFmt", type: "string", description: "X-axis format" },
      { name: "yFmt", type: "string", description: "Y-axis format" },
      { name: "title", type: "string", description: "Chart title" },
      { name: "subtitle", type: "string", description: "Chart subtitle" },
      { name: "height", type: "number", description: "Chart height in pixels" },
    ],
  },
  {
    name: "ScatterPlot",
    description: "Scatter plot with optional size encoding",
    props: [
      { name: "data", type: "string", required: true, description: "Query name or data array" },
      { name: "x", type: "string", required: true, description: "Column for x position" },
      { name: "y", type: "string", required: true, description: "Column for y position" },
      { name: "series", type: "string", description: "Column for color grouping" },
      { name: "size", type: "string", description: "Column for point size" },
      { name: "title", type: "string", description: "Chart title" },
      { name: "subtitle", type: "string", description: "Chart subtitle" },
      { name: "height", type: "number", description: "Chart height in pixels" },
    ],
  },
  {
    name: "DataTable",
    description: "Interactive data table with sorting, search, and pagination",
    props: [
      { name: "data", type: "string", required: true, description: "Query name or data array" },
      { name: "columns", type: "string[]", description: "Columns to display (default: all)" },
      { name: "pageSize", type: "number", description: "Rows per page (default: 10)" },
    ],
  },
  {
    name: "BigValue",
    description: "KPI card with main value, delta comparison, and sparkline",
    props: [
      { name: "data", type: "string", required: true, description: "Query name or data array" },
      { name: "value", type: "string", required: true, description: "Column for main value" },
      { name: "title", type: "string", description: "Card title" },
      { name: "fmt", type: "string", description: "Value format (num0, usd0, pct0)" },
      { name: "comparison", type: "string", description: "Column for comparison value" },
      { name: "comparisonFormat", type: "string", description: "Comparison format" },
      { name: "sparklineField", type: "string", description: "Column for sparkline trend" },
      { name: "isUpGood", type: "boolean", description: "Whether positive change is good (default: true)" },
    ],
  },
  {
    name: "Delta",
    description: "Change indicator with arrow and color",
    props: [
      { name: "value", type: "number", required: true, description: "Change value" },
      { name: "format", type: "string", description: "Value format" },
      { name: "isUpGood", type: "boolean", description: "Whether positive is good" },
    ],
  },
  {
    name: "Sparkline",
    description: "Inline mini trend chart",
    props: [
      { name: "data", type: "string", required: true, description: "Query name or data array" },
      { name: "y", type: "string", required: true, description: "Column for values" },
      { name: "height", type: "number", description: "Height in pixels (default: 32)" },
      { name: "width", type: "number", description: "Width in pixels (default: 120)" },
      { name: "color", type: "string", description: "Line color" },
    ],
  },
  {
    name: "ECharts",
    description: "Raw ECharts escape hatch for custom charts",
    props: [
      { name: "options", type: "EChartsOption", required: true, description: "Full ECharts option object" },
      { name: "title", type: "string", description: "Chart title" },
      { name: "subtitle", type: "string", description: "Chart subtitle" },
      { name: "height", type: "number", description: "Chart height in pixels" },
      { name: "notMerge", type: "boolean", description: "Don't merge with previous options" },
    ],
  },
  {
    name: "Grid",
    description: "Responsive grid layout",
    props: [
      { name: "cols", type: "number", required: true, description: "Number of columns (1-6)" },
    ],
  },
  {
    name: "Group",
    description: "Section wrapper with title",
    props: [
      { name: "title", type: "string", description: "Section title" },
    ],
  },
  {
    name: "Divider",
    description: "Horizontal divider line",
    props: [],
  },
  {
    name: "Tabs",
    description: "Tab container",
    props: [
      { name: "defaultValue", type: "string", description: "Default active tab value" },
    ],
  },
  {
    name: "Dropdown",
    description: "Single-select dropdown filter",
    props: [
      { name: "name", type: "string", required: true, description: "Filter variable name (used in ${name})" },
      { name: "data", type: "string", description: "Query name for options" },
      { name: "label", type: "string", description: "Display label" },
      { name: "defaultValue", type: "string", description: "Default selected value" },
    ],
  },
  {
    name: "DateRange",
    description: "Date range picker filter",
    props: [
      { name: "name", type: "string", required: true, description: "Filter variable name" },
      { name: "label", type: "string", description: "Display label" },
    ],
  },
  {
    name: "ButtonGroup",
    description: "Button group filter for toggling options",
    props: [
      { name: "name", type: "string", required: true, description: "Filter variable name" },
      { name: "options", type: "string[]", required: true, description: "Available options" },
      { name: "label", type: "string", description: "Display label" },
      { name: "defaultValue", type: "string", description: "Default selected value" },
    ],
  },
  {
    name: "TextInput",
    description: "Text input filter",
    props: [
      { name: "name", type: "string", required: true, description: "Filter variable name" },
      { name: "label", type: "string", description: "Display label" },
      { name: "placeholder", type: "string", description: "Placeholder text" },
    ],
  },
  {
    name: "MultiSelect",
    description: "Multi-select dropdown filter",
    props: [
      { name: "name", type: "string", required: true, description: "Filter variable name" },
      { name: "data", type: "string", description: "Query name for options" },
      { name: "label", type: "string", description: "Display label" },
    ],
  },
  {
    name: "Slider",
    description: "Numeric slider filter",
    props: [
      { name: "name", type: "string", required: true, description: "Filter variable name" },
      { name: "min", type: "number", required: true, description: "Minimum value" },
      { name: "max", type: "number", required: true, description: "Maximum value" },
      { name: "step", type: "number", description: "Step increment" },
      { name: "label", type: "string", description: "Display label" },
    ],
  },
  {
    name: "CheckboxFilter",
    description: "Checkbox filter",
    props: [
      { name: "name", type: "string", required: true, description: "Filter variable name" },
      { name: "label", type: "string", description: "Display label" },
    ],
  },
  {
    name: "DateInput",
    description: "Single date picker filter",
    props: [
      { name: "name", type: "string", required: true, description: "Filter variable name" },
      { name: "label", type: "string", description: "Display label" },
    ],
  },
];

export class ComponentCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] {
    const lineText = document.lineAt(position).text;
    const textBefore = lineText.substring(0, position.character);

    // After "<" — suggest component names
    if (textBefore.match(/<\w*$/)) {
      return COMPONENT_SCHEMAS.map((schema) => {
        const item = new vscode.CompletionItem(
          schema.name,
          vscode.CompletionItemKind.Class,
        );
        item.detail = `nsbi: ${schema.description}`;

        // Build snippet with required props
        const requiredProps = schema.props.filter((p) => p.required);
        const snippetParts = requiredProps.map(
          (p, i) => `${p.name}="\${${i + 1}:${p.name}}"`,
        );
        item.insertText = new vscode.SnippetString(
          `${schema.name} ${snippetParts.join(" ")} />`,
        );

        return item;
      });
    }

    // Inside a component tag — suggest props
    const tagMatch = textBefore.match(/<(\w+)\s/);
    if (tagMatch) {
      const componentName = tagMatch[1];
      const schema = COMPONENT_SCHEMAS.find((s) => s.name === componentName);
      if (!schema) return [];

      // Find which props are already used
      const usedProps = new Set<string>();
      const propMatches = lineText.matchAll(/(\w+)=/g);
      for (const m of propMatches) {
        usedProps.add(m[1]!);
      }

      return schema.props
        .filter((p) => !usedProps.has(p.name))
        .map((prop) => {
          const item = new vscode.CompletionItem(
            prop.name,
            vscode.CompletionItemKind.Property,
          );
          item.detail = `${prop.type}${prop.required ? " (required)" : ""}`;
          item.documentation = prop.description;

          if (prop.type === "boolean") {
            item.insertText = new vscode.SnippetString(`${prop.name}`);
          } else if (prop.type === "number") {
            item.insertText = new vscode.SnippetString(
              `${prop.name}={\${1:0}}`,
            );
          } else {
            item.insertText = new vscode.SnippetString(
              `${prop.name}="\${1:}"`,
            );
          }

          return item;
        });
    }

    return [];
  }
}
