# Polaris Documentation Accuracy Review

**Date:** March 31, 2026
**Scope:** All files in `docs-site/src/content/docs/` + `README.md`, cross-referenced against source code
**Verdict:** Request Changes — 13 inaccuracies found, 7 of which are high-severity

---

## Summary

The documentation is well-written and well-structured, but it has drifted significantly from the actual codebase. The most pervasive issue is a naming mismatch: the docs refer to the CLI and config as `nsbi` throughout, while the source code uses `polaris`. Beyond that, several component props are documented incorrectly (wrong types or nonexistent features), and the entire filter component system is documented as available in dashboards but isn't actually registered for MDX use.

---

## Critical Issues

### 1. CLI Name: `nsbi` vs `polaris`
**Severity:** HIGH — affects every getting-started instruction
**Docs say:** `npx nsbi dev`, `npx nsbi init`, `npx nsbi build`, `npx nsbi preview`
**Source says:** `cac("polaris")` in `cli/index.ts:30`, package name is `"polaris"`
**Actual command:** `npx polaris dev`, `npx polaris init`, etc.
**Files affected:** `getting-started.mdx`, `installation.mdx`, `cli.mdx`, `config.mdx`, all deployment docs

The README uses the correct `polaris` name. The entire docs-site uses the wrong `nsbi` name.

---

### 2. Config File Name: `nsbi.config.ts` vs `polaris.config.ts`
**Severity:** HIGH — users will create the wrong config file
**Docs say:** `nsbi.config.ts` / `nsbi.config.js` / `nsbi.config.json`
**Source says:** `CONFIG_FILES = ["polaris.config.ts", "polaris.config.js", "polaris.config.json"]` in `src/config/load-config.ts:5`
**Files affected:** `config.mdx`, `installation.mdx`, all deployment docs

---

### 3. File Extension: `.md` vs `.mdx`
**Severity:** HIGH — README will mislead users
**README says:** "Write `.md` files with SQL queries" and shows files like `index.md`, `revenue.md`
**Source says:** CLI only scans for `.mdx` files (`entry.name.endsWith(".mdx")` in `cli/index.ts:338,369`)
**Docs-site says:** `.mdx` (correct)

The README is wrong; the docs-site is correct. Users following the README will create `.md` files that are silently ignored.

---

### 4. Dropdown `options` Prop Type
**Severity:** HIGH — documented examples won't compile
**Docs say:** `options: string[]` with example `options={["free", "starter", "pro", "enterprise"]}`
**Source says:** `options: { label: string; value: string }[]` in `src/components/inputs/Dropdown.tsx:14`
**Correct usage:** `options={[{ label: "Free", value: "free" }, { label: "Starter", value: "starter" }]}`
**File affected:** `dropdown.mdx`

---

### 5. ButtonGroup `options` Prop Type
**Severity:** HIGH — documented examples won't compile
**Docs say:** `options: string[]` with example `options={["day", "week", "month"]}`
**Source says:** `options: { label: string; value: string }[]` in `src/components/inputs/ButtonGroup.tsx:8`
**File affected:** `buttongroup.mdx`

---

### 6. Dropdown `data` Prop — Does Not Exist
**Severity:** HIGH — documents a feature that isn't implemented
**Docs say:** Dropdown accepts `data: string` to populate options from a SQL query
**Source says:** `DropdownProps` interface has no `data` prop — only `name`, `label`, `options`, `defaultValue`
**File affected:** `dropdown.mdx`

---

### 7. MultiSelect `data` Prop — Does Not Exist
**Severity:** HIGH — documents a feature that isn't implemented
**Docs say:** MultiSelect accepts `data: string` for query-driven options
**Source says:** `MultiSelectProps` interface has no `data` prop — only `name`, `label`, `options`
**File affected:** `multiselect.mdx`

---

## Medium Issues

### 8. Filter Components Not Available in MDX
**Severity:** MEDIUM — core feature is documented but non-functional
**Docs say:** Filters like `<Dropdown>`, `<MultiSelect>`, `<ButtonGroup>`, `<TextInput>`, `<Slider>`, `<DateInput>`, `<DateRange>`, `<CheckboxFilter>` can be used in dashboard pages
**Source says:** None of these are registered in `src/components/mdx/index.ts`. Only charts, KPI, DataTable, and layout components are in the MDX component registry.

The filter components exist, are implemented, and `FilterProvider` wraps the MDX content — but the components themselves are never injected into the MDX scope. Users writing `<Dropdown>` in their `.mdx` file will get an error or silent failure.

This is likely a one-line-per-component fix in `mdx/index.ts`, but as-is, the documented filter workflow does not work.

---

### 9. Sparkline Not Available in MDX
**Severity:** MEDIUM
**Docs say:** `sparkline.mdx` documents the Sparkline component for use in dashboards
**Source says:** `Sparkline` is not in the `mdxComponents` registry. It's exported from the component library but not available in MDX pages.
**File affected:** `sparkline.mdx`

---

### 10. Grid `gap` Prop Not Available in MDX
**Severity:** MEDIUM
**Docs say:** Grid accepts `gap: number` (default 16)
**Source says:** The layout `Grid` (`src/components/layout/Grid.tsx`) has `gap`, but the MDX `Grid` (`src/components/mdx/Grid.tsx`) only accepts `cols` — gap is hardcoded to Tailwind's `gap-4` (~16px)
**File affected:** `grid.mdx`

---

### 11. Config Schema Incomplete in Docs
**Severity:** MEDIUM
**Docs say:** Config has `title`, `description`, `theme`, `basePath`, `data.dir`, `build.outDir`
**Source also has:** `models.dir` (default: `"models"`), `ai.provider` (default: `"anthropic"`), `ai.apiKey`, `ai.model` (default: `"claude-sonnet-4-20250514"`)
**File affected:** `config.mdx`

---

### 12. Delta `format` Examples
**Severity:** LOW
**Docs say:** Format examples include `"+0.0%"` and `"$#,##0"`
**Source says:** Delta passes `format` to a `formatValue()` utility. The actual format strings supported are Polaris-specific formats like `"usd_compact"`, `"num0"`, `"pct1"`, plus Vega-Lite format strings. The d3-format style `"$#,##0"` may or may not work depending on the formatter implementation.
**File affected:** `delta.mdx`

---

### 13. KPI Undocumented Props
**Severity:** LOW
**Docs say:** KPI has `data`, `value`, `title`, `format`, `comparison`, `comparisonFormat`, `comparisonLabel`, `isUpGood`
**Source also has:** The underlying `BigValue` component has `subtitle` and `height` props, but the MDX `KPI` wrapper does not expose them, so the docs are technically correct for what's available in dashboards. However, if a user imports `BigValue` directly from the component library, they'd want to know about these.

---

## What's Accurate

The following documented claims are correct and match source code:

- **Chart component props** (LineChart, BarChart, AreaChart) — `data`, `x`, `y`, `color`, `title`, `yFormat`, `xTimeUnit` all match
- **BarChart `stack` prop** — correctly documented as boolean, default false
- **KPI/BigValue props** — `data`, `value`, `title`, `format`, `comparison`, `comparisonFormat`, `comparisonLabel`, `isUpGood` all match
- **DataTable props** — `data`, `columns`, `pageSize` all match (pageSize default 10 is correct)
- **Tabs components** — Tabs, TabsList, TabsTrigger, TabsContent are correctly documented
- **Group and Divider** — correctly documented
- **CLI commands and flags** — `dev --project --port`, `init --template`, `build --project`, `preview --port` all match (aside from the name)
- **Available templates** — blank, saas-metrics, sales-pipeline, product-analytics all exist
- **Query syntax** — `-- name:` comment pattern, `${variable}` interpolation, parallel execution — all correct
- **SQL injection protection** — escaping behavior matches docs
- **Static vs filtered query classification** — correct
- **Page routing** — hash-based routing from `pages/` directory is correct
- **Deployment outputs** — `_redirects` for Netlify and `vercel.json` for Vercel are generated correctly
- **DateRange presets** — Last 7/30 days, This month/quarter/year, Custom — all match source
- **Slider props** — `name`, `min`, `max`, `step`, `label` all match, step defaults to 1

---

## Recommended Fixes (Priority Order)

### P0 — Blocking for launch

1. **Global find-and-replace `nsbi` → `polaris`** across all docs-site content files. This affects the CLI name, config file name, and branding throughout.

2. **Fix README**: Change `.md` references to `.mdx` in file extensions and directory structure examples.

3. **Fix Dropdown and ButtonGroup `options` type**: Change from `string[]` to `{ label: string; value: string }[]` in docs and examples. Or, add a convenience wrapper that accepts `string[]` and normalizes to objects (better DX).

4. **Remove `data` prop from Dropdown and MultiSelect docs**, or implement the feature. The query-driven options pattern is a good idea — consider implementing it before launch.

### P1 — Should fix before launch

5. **Register filter components in MDX**: Add all 8 filter components to `src/components/mdx/index.ts`. This is the highest-impact code fix — without it, the documented filter workflow doesn't work at all.

6. **Register Sparkline in MDX**: Add to `mdxComponents` in `src/components/mdx/index.ts`.

7. **Fix Grid docs**: Either remove the `gap` prop from docs, or add `gap` support to the MDX Grid component.

8. **Document `models` and `ai` config sections** in `config.mdx`.

### P2 — Nice to have

9. Clarify Delta `format` strings — list the actual supported format tokens.

10. Document BigValue's `subtitle` and `height` props for library users.

11. Add a "Components Reference" page that lists which components are available in MDX dashboards vs as library imports.

---

## Issue Count

| Severity | Count |
|----------|-------|
| HIGH | 7 |
| MEDIUM | 4 |
| LOW | 2 |
| **Total** | **13** |
