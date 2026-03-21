/**
 * Export a Northstar dashboard as a standalone nsbi project.
 *
 * Converts semantic queries to SQL blocks and packages everything
 * as a self-contained nsbi project directory.
 */

export interface NorthstarDashboard {
  id: string;
  title: string;
  content: string; // MDX content
  queryResults?: Record<
    string,
    { rows: Record<string, unknown>[]; columns: { name: string; type: string }[] }
  >;
}

export interface ExportOptions {
  outputDir: string;
  includeData?: boolean;
}

export interface NsbiProjectFiles {
  "nsbi.config.ts": string;
  "pages/index.mdx": string;
  [key: string]: string;
}

/**
 * Convert a Northstar dashboard to nsbi project files.
 */
export function exportToNsbiProject(
  dashboard: NorthstarDashboard,
): NsbiProjectFiles {
  // Convert semantic blocks to SQL if query results are available
  let mdxContent = dashboard.content;

  // Generate config
  const config = `import type { NsbiConfig } from "nsbi";

export default {
  title: ${JSON.stringify(dashboard.title)},
  theme: "dark",
} satisfies NsbiConfig;
`;

  // If there are pre-rendered query results, embed them as SQL
  if (dashboard.queryResults) {
    for (const [name, result] of Object.entries(dashboard.queryResults)) {
      // Check if there's a semantic block for this query
      const semanticRegex = new RegExp(
        `\`\`\`semantic\\s*\\nname:\\s*${name}[\\s\\S]*?\`\`\``,
      );
      const match = mdxContent.match(semanticRegex);
      if (match && result.columns.length > 0) {
        // Generate a SQL approximation from the results
        const cols = result.columns.map((c) => c.name).join(", ");
        const sqlBlock = `\`\`\`sql\n-- name: ${name}\n-- Exported from Northstar\nSELECT ${cols}\nFROM ${name}\n\`\`\``;
        mdxContent = mdxContent.replace(semanticRegex, sqlBlock);
      }
    }
  }

  return {
    "nsbi.config.ts": config,
    "pages/index.mdx": mdxContent,
  };
}
