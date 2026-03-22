import React, { useState, useCallback, useRef, useMemo } from "react";
import { BuilderContext, useBuilderReducer, generateChartId } from "./BuilderStore";
import { ChartTypeSelector, type ChartVariant } from "./ChartTypeSelector";
import { AxisMapper } from "./AxisMapper";
import { FormatPicker } from "./FormatPicker";
import { ResultsTable } from "./ResultsTable";
import { SchemaProvider, useSchema } from "@/components/schema/SchemaContext";
import { useQueryEngine } from "@/engine/EngineContext";
import { VegaChart } from "@/components/charts/VegaChart";
import { DataTable } from "@/components/charts/DataTable";
import { BigValue } from "@/components/charts/BigValue";
import { applyPreset } from "@/config/presets";
import type { ChartSpec } from "@/builder/types";

interface QueryResult {
  rows: Record<string, unknown>[];
  columns: { name: string; type: string }[];
}

/** Infer Vega-Lite type from column metadata */
function inferVegaType(colName: string, columns: { name: string; type: string }[]): string {
  const col = columns.find((c) => c.name === colName);
  if (!col) return "nominal";
  const t = col.type.toUpperCase();
  if (/INT|FLOAT|DOUBLE|DECIMAL|NUMERIC|REAL|BIGINT|NUMBER/.test(t)) return "quantitative";
  if (/DATE|TIME|TIMESTAMP/.test(t)) return "temporal";
  return "nominal";
}

/** Build a Vega-Lite partial spec from axis mappings */
function buildVegaSpec(
  variant: ChartVariant,
  xAxis: string,
  yAxes: string[],
  series: string,
  columns: { name: string; type: string }[],
): Record<string, unknown> {
  const encoding: Record<string, unknown> = {};
  if (xAxis) {
    encoding.x = { field: xAxis, type: inferVegaType(xAxis, columns) };
  }
  const filledYs = yAxes.filter(Boolean);
  if (filledYs[0]) {
    encoding.y = { field: filledYs[0], type: inferVegaType(filledYs[0], columns) };
  }
  if (series) {
    encoding.color = { field: series, type: inferVegaType(series, columns) };
  }

  // For pie charts, use theta instead of y
  if (variant.type === "pie" && filledYs[0]) {
    encoding.theta = encoding.y;
    delete encoding.y;
    delete encoding.x;
  }

  const partialSpec = { encoding };
  return applyPreset(variant.type, partialSpec);
}

interface LiveChartPreviewProps {
  variant: ChartVariant | null;
  data: Record<string, unknown>[];
  columns: { name: string; type: string }[];
  xAxis: string;
  yAxes: string[];
  series: string;
}

function LiveChartPreview({ variant, data, columns, xAxis, yAxes, series }: LiveChartPreviewProps) {
  if (!variant) {
    return (
      <div className="flex items-center justify-center h-full text-[12px] text-muted-foreground">
        Select a chart type to see preview
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[12px] text-muted-foreground">
        Run a query to see chart preview
      </div>
    );
  }

  if (variant.type === "DataTable") {
    return <DataTable data={data} height={350} />;
  }

  if (variant.type === "BigValue") {
    const filledYs = yAxes.filter(Boolean);
    return <BigValue data={data} value={filledYs[0] || ""} />;
  }

  // All other chart types render via VegaChart
  if (!xAxis && variant.type !== "pie" && variant.type !== "histogram") {
    return (
      <div className="flex items-center justify-center h-full text-[12px] text-muted-foreground">
        Map X and Y axes to see preview
      </div>
    );
  }

  const spec = buildVegaSpec(variant, xAxis, yAxes, series, columns);
  return <VegaChart spec={spec} data={{ table: data }} height={350} />;
}

function ChartBuilderInner() {
  const [state, dispatch] = useBuilderReducer();
  const { schema } = useSchema();
  const engine = useQueryEngine();

  // SQL editor state
  const [queryName, setQueryName] = useState("query_1");
  const [sql, setSql] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Query results -- persist across chart creation
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Chart config -- variant includes type + implied props (stacked, horizontal)
  const [selectedVariant, setSelectedVariant] = useState<ChartVariant | null>(null);
  const [xAxis, setXAxis] = useState("");
  const [yAxes, setYAxes] = useState<string[]>([""]);
  const [series, setSeries] = useState("");
  const [format, setFormat] = useState("");

  // Bottom pane view
  const [bottomView, setBottomView] = useState<"chart" | "code">("chart");

  const availableColumns = queryResult?.columns.map((c) => c.name) ?? [];
  const chartType = selectedVariant?.type ?? null;

  const runQuery = useCallback(async () => {
    if (!sql.trim()) return;
    setQueryLoading(true);
    setQueryError(null);
    try {
      const result = await engine.executeQuery(sql);
      setQueryResult({ rows: result.rows, columns: result.columns });
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : String(err));
      setQueryResult(null);
    } finally {
      setQueryLoading(false);
    }
  }, [sql, engine]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      runQuery();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current!;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newVal = sql.substring(0, start) + "  " + sql.substring(end);
      setSql(newVal);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  };

  const addYAxis = () => setYAxes((prev) => [...prev, ""]);
  const removeYAxis = (idx: number) => setYAxes((prev) => prev.filter((_, i) => i !== idx));
  const updateYAxis = (idx: number, val: string) =>
    setYAxes((prev) => prev.map((v, i) => (i === idx ? val : v)));

  const addToPage = useCallback(() => {
    if (queryName && sql) {
      dispatch({ type: "ADD_QUERY", query: { name: queryName, type: "sql", sql } });
    }
    if (selectedVariant && queryName) {
      const columns = queryResult?.columns ?? [];
      const vegaSpec = buildVegaSpec(selectedVariant, xAxis, yAxes, series, columns);
      const chart: ChartSpec = {
        id: generateChartId(),
        type: selectedVariant.type as ChartSpec["type"],
        dataSource: queryName,
        preset: selectedVariant.type,
        spec: vegaSpec,
      };
      dispatch({ type: "ADD_CHART", chart });
    }
    // Increment query name for next chart, but keep SQL + results
    setQueryName(`query_${state.pageSpec.queries.length + 2}`);
    setSelectedVariant(null);
    setXAxis("");
    setYAxes([""]);
    setSeries("");
    setFormat("");
  }, [dispatch, queryName, sql, selectedVariant, xAxis, yAxes, series, format, state.pageSpec.queries.length, queryResult]);

  // Generate YAML — live from current form state + any committed charts
  const yamlOutput = useMemo(() => {
    const ps = state.pageSpec;
    const committedCharts = ps.layout.filter((item): item is ChartSpec => "id" in item);

    // Build the current working chart (not yet added to page)
    const hasWorkingChart = selectedVariant && sql.trim();
    const workingSpec = selectedVariant && queryResult
      ? buildVegaSpec(selectedVariant, xAxis, yAxes, series, queryResult.columns)
      : null;

    if (ps.queries.length === 0 && committedCharts.length === 0 && !hasWorkingChart) return "";

    const lines: string[] = [];
    if (ps.title) lines.push(`title: ${ps.title}`);
    lines.push("");

    // Queries: committed + current working query
    const allQueries = [...ps.queries];
    if (hasWorkingChart && !allQueries.some((q) => q.name === queryName)) {
      allQueries.push({ name: queryName, type: "sql", sql });
    }

    if (allQueries.length > 0) {
      lines.push("queries:");
      for (const q of allQueries) {
        lines.push(`  ${q.name}:`);
        lines.push(`    sql: |`);
        for (const sqlLine of (q.sql || "").split("\n")) {
          lines.push(`      ${sqlLine}`);
        }
      }
      lines.push("");
    }

    // Charts: committed + current working chart
    const allChartEntries: { id: string; dataSource: string; preset?: string; spec: Record<string, unknown> }[] = [
      ...committedCharts,
    ];
    if (hasWorkingChart && workingSpec && selectedVariant) {
      allChartEntries.push({
        id: `${queryName}_chart`,
        dataSource: queryName,
        preset: selectedVariant.type,
        spec: workingSpec,
      });
    }

    if (allChartEntries.length > 0) {
      lines.push("layout:");
      lines.push("  - row:");
      for (const chart of allChartEntries) {
        lines.push(`    - chart: ${chart.id}`);
      }
      lines.push("");

      lines.push("charts:");
      for (const chart of allChartEntries) {
        lines.push(`  ${chart.id}:`);
        lines.push(`    data: ${chart.dataSource}`);
        if (chart.preset) lines.push(`    preset: ${chart.preset}`);
        if (chart.spec?.encoding) {
          lines.push("    spec:");
          lines.push("      encoding:");
          const enc = chart.spec.encoding as Record<string, Record<string, unknown>>;
          for (const [channel, def] of Object.entries(enc)) {
            const parts = Object.entries(def).map(([k, v]) => `${k}: ${v}`).join(", ");
            lines.push(`        ${channel}: { ${parts} }`);
          }
        }
      }
    }

    return lines.join("\n");
  }, [state.pageSpec, selectedVariant, sql, queryName, xAxis, yAxes, series, queryResult]);

  return (
    <BuilderContext.Provider value={{ state, dispatch }}>
      <div className="h-full overflow-y-auto p-4 space-y-4">
        {/* SQL Query + Results */}
        <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/70 bg-muted/30">
            <span className="text-[12px] font-medium text-foreground">Dataframe</span>
            <div className="flex-1" />
            <input
              type="text"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              className="bg-accent rounded px-2 py-0.5 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary w-[120px]"
              placeholder="Query name"
            />
            {schema && schema.tables.length > 0 && (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    const table = e.target.value;
                    const cols = schema.tables.find((t) => t.name === table)?.columns.map((c) => c.name).join(", ") ?? "*";
                    setSql((prev) => prev || `SELECT ${cols}\nFROM ${table}\nLIMIT 100`);
                    e.target.value = "";
                  }
                }}
                className="bg-accent rounded px-2 py-0.5 text-[11px] text-muted-foreground outline-none"
              >
                <option value="">Insert table...</option>
                {schema.tables.map((t) => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={runQuery}
              disabled={!sql.trim() || queryLoading}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-[12px] bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-40 transition-colors"
            >
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              {queryLoading ? "Running..." : "Run"}
            </button>
          </div>

          <div className="border-b border-border/50">
            <textarea
              ref={textareaRef}
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="SELECT * FROM ..."
              spellCheck={false}
              rows={5}
              className="w-full bg-transparent px-4 py-3 text-[13px] text-foreground font-mono leading-[1.6] outline-none resize-y placeholder:text-muted-foreground min-h-[80px]"
            />
          </div>

          <div className="h-[240px] min-h-0">
            <ResultsTable
              rows={queryResult?.rows ?? []}
              columns={queryResult?.columns ?? []}
              loading={queryLoading}
              error={queryError}
            />
          </div>
        </div>

        {/* Chart Builder */}
        <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/70 bg-muted/30">
            <span className="text-[12px] font-medium text-foreground">Chart</span>
            <div className="flex-1" />
            <div className="flex items-center rounded bg-accent p-0.5">
              <button
                onClick={() => setBottomView("chart")}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  bottomView === "chart"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-muted-foreground"
                }`}
              >
                Builder
              </button>
              <button
                onClick={() => setBottomView("code")}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  bottomView === "code"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-muted-foreground"
                }`}
              >
                Code
              </button>
            </div>
            <input
              type="text"
              value={state.pageSpec.title}
              onChange={(e) => dispatch({ type: "SET_TITLE", title: e.target.value })}
              className="bg-accent rounded px-2 py-0.5 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary w-[140px]"
              placeholder="Dashboard title"
            />
            <button
              onClick={addToPage}
              disabled={!queryName || (!sql && !selectedVariant)}
              className="px-3 py-1 rounded text-[11px] bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-40 transition-colors"
            >
              Add to Dashboard
            </button>
          </div>

          {/* Builder view */}
          <div className={`flex min-h-[400px] ${bottomView !== "chart" ? "hidden" : ""}`}>
            {/* Left: Data + Chart Type */}
            <div className="w-[240px] shrink-0 border-r border-border/70 overflow-y-auto">
              <div className="px-3 py-2 border-b border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Data</span>
                </div>
                {availableColumns.length > 0 ? (
                  <div className="space-y-0.5">
                    {availableColumns.map((col) => {
                      const colMeta = queryResult?.columns.find((c) => c.name === col);
                      const isNumeric = colMeta?.type && /int|float|double|decimal|numeric|bigint|real/i.test(colMeta.type);
                      return (
                        <div
                          key={col}
                          className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-foreground hover:bg-muted/60 cursor-default"
                        >
                          <span className={`text-[10px] ${isNumeric ? "text-primary" : "text-muted-foreground"}`}>
                            {isNumeric ? "#" : "A"}
                          </span>
                          <span className="truncate">{col}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">Run a query to see columns</p>
                )}
              </div>

              <div className="px-3 py-2 border-b border-border/50">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-2">Chart Type</span>
                <ChartTypeSelector selected={selectedVariant} onSelect={setSelectedVariant} />
              </div>

              {state.pageSpec.layout.length > 0 && (
                <div className="px-3 py-2">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                    Dashboard ({state.pageSpec.layout.length})
                  </span>
                  <div className="space-y-1">
                    {state.pageSpec.layout.map((item) => {
                      if (!("id" in item)) return null;
                      const chart = item as ChartSpec;
                      return (
                        <div
                          key={chart.id}
                          className="flex items-center justify-between px-2 py-1 rounded bg-muted/60 text-[10px]"
                        >
                          <span className="text-foreground truncate">
                            {chart.type} / {chart.dataSource}
                          </span>
                          <button
                            onClick={() => dispatch({ type: "REMOVE_CHART", id: chart.id })}
                            className="text-muted-foreground hover:text-destructive ml-1 shrink-0"
                          >
                            x
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Middle: Axis config */}
            {selectedVariant && chartType !== "DataTable" && (
              <div className="w-[220px] shrink-0 border-r border-border/70 overflow-y-auto p-3 space-y-3">
                {chartType !== "BigValue" && (
                  <>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">X-axis</label>
                      <AxisMapper label="" value={xAxis} columns={availableColumns} onChange={setXAxis} />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Y-axis</label>
                        <button onClick={addYAxis} className="text-[10px] text-primary hover:text-foreground">
                          + Y-axis
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {yAxes.map((yVal, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <div className="flex-1">
                              <AxisMapper label="" value={yVal} columns={availableColumns} onChange={(v) => updateYAxis(idx, v)} />
                            </div>
                            {yAxes.length > 1 && (
                              <button onClick={() => removeYAxis(idx)} className="text-[10px] text-muted-foreground hover:text-destructive shrink-0">
                                x
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Color by</label>
                      <AxisMapper label="" value={series} columns={availableColumns} onChange={setSeries} optional />
                    </div>
                  </>
                )}

                {chartType === "BigValue" && (
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Value</label>
                    <AxisMapper label="" value={yAxes[0] ?? ""} columns={availableColumns} onChange={(v) => setYAxes([v])} />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Format</label>
                  <FormatPicker label="" value={format} onChange={setFormat} />
                </div>
              </div>
            )}

            {/* Right: Live Chart Preview */}
            <div className="flex-1 min-w-0 overflow-y-auto p-4">
              <LiveChartPreview
                variant={selectedVariant}
                data={queryResult?.rows ?? []}
                columns={queryResult?.columns ?? []}
                xAxis={xAxis}
                yAxes={yAxes}
                series={series}
              />
            </div>
          </div>

          {/* Code view */}
          <div className={`min-h-[400px] overflow-auto ${bottomView !== "code" ? "hidden" : ""}`}>
            <pre className="p-4 text-[12px] text-muted-foreground font-mono whitespace-pre-wrap break-words leading-[1.6]">
              {yamlOutput || "# Add queries and charts to generate YAML config"}
            </pre>
          </div>
        </div>
      </div>
    </BuilderContext.Provider>
  );
}

export function ChartBuilder() {
  return (
    <SchemaProvider>
      <ChartBuilderInner />
    </SchemaProvider>
  );
}
