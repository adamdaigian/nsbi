import { describe, it, expect } from "vitest";
import { parseDocument } from "@/engine/parser";

describe("parseDocument", () => {
  describe("frontmatter parsing", () => {
    it("extracts title and description from YAML frontmatter", () => {
      const doc = `---
title: My Dashboard
description: A test dashboard
---

Some content here.`;

      const result = parseDocument(doc);
      expect(result.frontmatter.title).toBe("My Dashboard");
      expect(result.frontmatter.description).toBe("A test dashboard");
      expect(result.errors).toHaveLength(0);
    });

    it("extracts tags from frontmatter", () => {
      const doc = `---
title: Tagged Page
tags:
  - finance
  - quarterly
---

Content.`;

      const result = parseDocument(doc);
      expect(result.frontmatter.tags).toEqual(["finance", "quarterly"]);
    });

    it("returns empty frontmatter when none is present", () => {
      const result = parseDocument("Just some content.");
      expect(result.frontmatter).toEqual({});
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("SQL block extraction", () => {
    it("extracts a named SQL block with -- name: comment", () => {
      const doc = `---
title: Test
---

\`\`\`sql
-- name: revenue
SELECT sum(amount) FROM orders
\`\`\``;

      const result = parseDocument(doc);
      expect(result.queries).toHaveLength(1);
      expect(result.queries[0]).toMatchObject({
        name: "revenue",
        type: "sql",
        sql: "SELECT sum(amount) FROM orders",
      });
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("auto-naming", () => {
    it("auto-names unnamed SQL blocks as query_1, query_2, etc.", () => {
      const doc = `\`\`\`sql
SELECT 1
\`\`\`

\`\`\`sql
SELECT 2
\`\`\``;

      const result = parseDocument(doc);
      expect(result.queries).toHaveLength(2);
      expect(result.queries[0]).toMatchObject({
        name: "query_1",
        type: "sql",
        sql: "SELECT 1",
      });
      expect(result.queries[1]).toMatchObject({
        name: "query_2",
        type: "sql",
        sql: "SELECT 2",
      });
    });
  });

  describe("template variables", () => {
    it("detects ${varName} in SQL and records filterVariables", () => {
      const doc = `\`\`\`sql
-- name: filtered
SELECT * FROM orders WHERE region = \${region} AND year = \${year}
\`\`\``;

      const result = parseDocument(doc);
      expect(result.queries).toHaveLength(1);
      expect(result.queries[0]).toMatchObject({
        name: "filtered",
        type: "sql",
        filterVariables: ["region", "year"],
      });
    });

    it("does not include filterVariables when none are present", () => {
      const doc = `\`\`\`sql
-- name: simple
SELECT * FROM orders
\`\`\``;

      const result = parseDocument(doc);
      const q = result.queries[0]!;
      expect(q.type === "sql" ? q.filterVariables : undefined).toBeUndefined();
    });

    it("deduplicates repeated template variables", () => {
      const doc = `\`\`\`sql
-- name: dupes
SELECT * FROM t WHERE a = \${x} AND b = \${x}
\`\`\``;

      const result = parseDocument(doc);
      expect(result.queries[0]).toMatchObject({
        filterVariables: ["x"],
      });
    });
  });

  describe("content stripping", () => {
    it("removes frontmatter and SQL blocks from returned content", () => {
      const doc = `---
title: Dashboard
---

# Hello World

\`\`\`sql
-- name: data
SELECT 1
\`\`\`

Some trailing text.`;

      const result = parseDocument(doc);
      expect(result.content).not.toContain("---");
      expect(result.content).not.toContain("```sql");
      expect(result.content).not.toContain("SELECT 1");
      expect(result.content).toContain("# Hello World");
      expect(result.content).toContain("Some trailing text.");
    });
  });

  describe("multiple queries", () => {
    it("handles a mix of named and unnamed SQL blocks", () => {
      const doc = `\`\`\`sql
-- name: first
SELECT 1
\`\`\`

\`\`\`sql
SELECT 2
\`\`\`

\`\`\`sql
-- name: third
SELECT 3
\`\`\``;

      const result = parseDocument(doc);
      expect(result.queries).toHaveLength(3);
      expect(result.queries[0]!.name).toBe("first");
      // The unnamed block is auto-numbered based on its position among unnamed blocks
      expect(result.queries[1]!.name).toBe("query_2");
      expect(result.queries[2]!.name).toBe("third");
    });
  });

  describe("empty/minimal input", () => {
    it("handles an empty string", () => {
      const result = parseDocument("");
      expect(result.frontmatter).toEqual({});
      expect(result.queries).toHaveLength(0);
      expect(result.content).toBe("");
      expect(result.errors).toHaveLength(0);
    });

    it("handles minimal frontmatter with no content", () => {
      const doc = `---
title: Bare
---`;

      const result = parseDocument(doc);
      expect(result.frontmatter.title).toBe("Bare");
      expect(result.queries).toHaveLength(0);
      expect(result.content).toBe("");
    });
  });
});
