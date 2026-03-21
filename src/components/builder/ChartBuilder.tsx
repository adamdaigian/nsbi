import React, { useState, useCallback, useRef } from "react";
import { BuilderContext, useBuilderReducer, generateChartId } from "./BuilderStore";
import { ChartTypeSelector, type ChartVariant } from "./ChartTypeSelector";
import { AxisMapper } from "./AxisMapper";
import { FormatPicker } from "./FormatPicker";
import { ResultsTable } from "./ResultsTable";
import { SchemaProvider, useSchema } from "@/components/schema/SchemaContext";
import { useQueryEngine } from "@/engine/EngineContext";
import { pageSpecToMDX } from "@/builder/codegen";
import type { ChartSpec } from "@/builder/types";

// Import chart components directly for live preview (no MDX round-trip)
import { LineChart } from "@/components/charts/LineChart";
import { AreaChart } from "@/components/charts/AreaChart";
import { BarChart } from "@/components/charts/BarChart";
import { ScatterPlot } from "@/components/charts/ScatterPlot";
import { DataTable } from "@/components/charts/DataTable";
import { BigValue } from "@/components/charts/BigValue";
import { Sparkline } from "@/components/charts/Sparkline";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CHART_COMPONENTS: Record<string, React.ComponentType<any>> = {
  LineChart,
  AreaChart,
  BarChart,
  ScatterPlot,
  DataTable,
  BigValue,
  Sparkline,
};

interface QueryResult {
  rows: Record<string, unknown>[];
  columns: { name: string; type: string }[];
}

interface LiveChartPreviewProps {
  variant: ChartVariant | null;
  data: Record<string, unknown>[];
  xAxis: string;
  yAxes: string[];
  series: string;
  format: string;
}

function LiveChartPreview({ variant, data, xAxis, yAxes, series, format }: LiveChartPreviewProps) {
  if (!variant) {
    return (
      <div className="flex items-center justify-center h-full text-[12px] text-[#666]">
        Select a chart type to see preview
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[12px] text-[#666]">
        Run a query to see chart preview
      </div>
    );
  }

  const ChartComponent = CHART_COMPONENTS[variant.type];
  if (!ChartComponent) {
    return (
      <div className="flex items-center justify-center h-full text-[12px] text-[#666]">
        Unsupported chart type
      </div>
    );
  }

  // Build props: start with implied props from variant, then add axis mappings
  const filledYs = yAxes.filter(Boolean);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartProps: Record<string, any> = { data, height: 350, ...variant.impliedProps };

  if (variant.type === "BigValue") {
    if (filledYs[0]) chartProps.value = filledYs[0];
  } else if (variant.type === "DataTable") {
    // DataTable just needs data
  } else {
    if (xAxis) chartProps.x = xAxis;
    if (filledYs[0]) chartProps.y = filledYs[0];
    if (filledYs[1]) chartProps.y2 = filledYs[1];
    if (series) chartProps.series = series;
    if (format) chartProps.yFmt = format;
  }

  return <ChartComponent {...chartProps} />;
}

/** Merge variant implied props + user axis config into a single props object */
function buildChartProps(
  variant: ChartVariant,
  xAxis: string,
  yAxes: string[],
  series: string,
  format: string,
): Record<string, unknown> {
  const props: Record<string, unknown> = { ...variant.impliedProps };
  if (xAxis) props.x = xAxis;
  const filledYs = yAxes.filter(Boolean);
  if (filledYs[0]) props.y = filledYs[0];
  if (filledYs[1]) props.y2 = filledYs[1];
  if (series) props.series = series;
  if (format) props.yFormat = format;
  return props;
}

function ChartBuilderInner() {
  const [state, dispatch] = useBuilderReducer();
  const { schema } = useSchema();
  const engine = useQueryEngine();

  // SQL editor state
  const [queryName, setQueryName] = useState("query_1");
  const [sql, setSql] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Query results — persist across chart creation
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Chart config — variant includes type + implied props (stacked, horizontal)
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
      const props = buildChartProps(selectedVariant, xAxis, yAxes, series, format);
      const chart: ChartSpec = {
        id: generateChartId(),
        type: selectedVariant.type,
        queryRef: queryName,
        props,
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
  }, [dispatch, queryName, sql, selectedVariant, xAxis, yAxes, series, format, state.pageSpec.queries.length]);

  // Build a live page spec that includes the current (uncommitted) chart config
  const livePageSpec = (() => {
    const spec = { ...state.pageSpec, queries: [...state.pageSpec.queries], layout: [...state.pageSpec.layout] };

    if (queryName && sql) {
      const nameExists = spec.queries.some((q) => q.name === queryName);
      const sqlExists = spec.queries.some((q) => q.type === "sql" && q.sql === sql);
      if (!nameExists && !sqlExists) {
        spec.queries = [...spec.queries, { name: queryName, type: "sql" as const, sql }];
      }
    }

    if (selectedVariant && queryName) {
      const props = buildChartProps(selectedVariant, xAxis, yAxes, series, format);
      spec.layout = [...spec.layout, { id: "__live__", type: selectedVariant.type, queryRef: queryName, props } as ChartSpec];
    }

    return spec;
  })();

  const mdxOutput = pageSpecToMDX(livePageSpec);

  return (
    <BuilderContext.Provider value={{ state, dispatch }}>
      <div className="h-full overflow-y-auto p-4 space-y-4">
        {/* ═══ CARD 1: SQL Query + Results ═══ */}
        <div className="rounded-lg border border-[rgba(148,148,148,0.12)] bg-[rgba(64,64,64,0.03)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[rgba(148,148,148,0.08)] bg-[rgba(64,64,64,0.05)]">
            <span className="text-[12px] font-medium text-[#FFFFFF]">Dataframe</span>
            <div className="flex-1" />
            <input
              type="text"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              className="bg-[rgba(64,64,64,0.2)] rounded px-2 py-0.5 text-[11px] text-[#FFFFFF] outline-none focus:ring-1 focus:ring-[#5A7B8F] w-[120px]"
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
                className="bg-[rgba(64,64,64,0.2)] rounded px-2 py-0.5 text-[11px] text-[#949494] outline-none"
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
              className="flex items-center gap-1.5 px-3 py-1 rounded text-[12px] bg-[rgba(90,123,143,0.2)] text-[#5A7B8F] hover:bg-[rgba(90,123,143,0.3)] disabled:opacity-40 transition-colors"
            >
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              {queryLoading ? "Running..." : "Run"}
            </button>
          </div>

          <div className="border-b border-[rgba(148,148,148,0.06)]">
            <textarea
              ref={textareaRef}
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="SELECT * FROM ..."
              spellCheck={false}
              rows={5}
              className="w-full bg-transparent px-4 py-3 text-[13px] text-[#FFFFFF] font-mono leading-[1.6] outline-none resize-y placeholder:text-[#444] min-h-[80px]"
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

        {/* ═══ CARD 2: Chart Builder ═══ */}
        <div className="rounded-lg border border-[rgba(148,148,148,0.12)] bg-[rgba(64,64,64,0.03)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[rgba(148,148,148,0.08)] bg-[rgba(64,64,64,0.05)]">
            <span className="text-[12px] font-medium text-[#FFFFFF]">Chart</span>
            <div className="flex-1" />
            <div className="flex items-center rounded bg-[rgba(64,64,64,0.15)] p-0.5">
              <button
                onClick={() => setBottomView("chart")}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  bottomView === "chart"
                    ? "bg-[rgba(90,123,143,0.2)] text-[#5A7B8F]"
                    : "text-[#666] hover:text-[#949494]"
                }`}
              >
                Builder
              </button>
              <button
                onClick={() => setBottomView("code")}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  bottomView === "code"
                    ? "bg-[rgba(90,123,143,0.2)] text-[#5A7B8F]"
                    : "text-[#666] hover:text-[#949494]"
                }`}
              >
                Code
              </button>
            </div>
            <input
              type="text"
              value={state.pageSpec.title}
              onChange={(e) => dispatch({ type: "SET_TITLE", title: e.target.value })}
              className="bg-[rgba(64,64,64,0.2)] rounded px-2 py-0.5 text-[11px] text-[#FFFFFF] outline-none focus:ring-1 focus:ring-[#5A7B8F] w-[140px]"
              placeholder="Dashboard title"
            />
            <button
              onClick={addToPage}
              disabled={!queryName || (!sql && !selectedVariant)}
              className="px-3 py-1 rounded text-[11px] bg-[rgba(90,123,143,0.2)] text-[#5A7B8F] hover:bg-[rgba(90,123,143,0.3)] disabled:opacity-40 transition-colors"
            >
              Add to Dashboard
            </button>
          </div>

          {/* Builder view — always mounted, hidden via CSS */}
          <div className={`flex min-h-[400px] ${bottomView !== "chart" ? "hidden" : ""}`}>
            {/* Left: Data + Chart Type */}
            <div className="w-[240px] shrink-0 border-r border-[rgba(148,148,148,0.08)] overflow-y-auto">
              <div className="px-3 py-2 border-b border-[rgba(148,148,148,0.06)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium text-[#949494] uppercase tracking-wider">Data</span>
                </div>
                {availableColumns.length > 0 ? (
                  <div className="space-y-0.5">
                    {availableColumns.map((col) => {
                      const colMeta = queryResult?.columns.find((c) => c.name === col);
                      const isNumeric = colMeta?.type && /int|float|double|decimal|numeric|bigint|real/i.test(colMeta.type);
                      return (
                        <div
                          key={col}
                          className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-[#FFFFFF] hover:bg-[rgba(64,64,64,0.1)] cursor-default"
                        >
                          <span className={`text-[10px] ${isNumeric ? "text-[#5A7B8F]" : "text-[#949494]"}`}>
                            {isNumeric ? "#" : "A"}
                          </span>
                          <span className="truncate">{col}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-[#666]">Run a query to see columns</p>
                )}
              </div>

              <div className="px-3 py-2 border-b border-[rgba(148,148,148,0.06)]">
                <span className="text-[10px] font-medium text-[#949494] uppercase tracking-wider block mb-2">Chart Type</span>
                <ChartTypeSelector selected={selectedVariant} onSelect={setSelectedVariant} />
              </div>

              {state.pageSpec.layout.length > 0 && (
                <div className="px-3 py-2">
                  <span className="text-[10px] font-medium text-[#949494] uppercase tracking-wider block mb-2">
                    Dashboard ({state.pageSpec.layout.length})
                  </span>
                  <div className="space-y-1">
                    {state.pageSpec.layout.map((item) => {
                      if (!("id" in item)) return null;
                      const chart = item as ChartSpec;
                      return (
                        <div
                          key={chart.id}
                          className="flex items-center justify-between px-2 py-1 rounded bg-[rgba(64,64,64,0.1)] text-[10px]"
                        >
                          <span className="text-[#FFFFFF] truncate">
                            {chart.type} / {chart.queryRef}
                          </span>
                          <button
                            onClick={() => dispatch({ type: "REMOVE_CHART", id: chart.id })}
                            className="text-[#666] hover:text-[hsl(0,84%,60%)] ml-1 shrink-0"
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

            {/* Middle: Axis config — only show when a chart variant is selected */}
            {selectedVariant && chartType !== "DataTable" && (
              <div className="w-[220px] shrink-0 border-r border-[rgba(148,148,148,0.08)] overflow-y-auto p-3 space-y-3">
                {chartType !== "BigValue" && (
                  <>
                    <div>
                      <label className="text-[10px] font-medium text-[#949494] uppercase tracking-wider block mb-1">X-axis</label>
                      <AxisMapper label="" value={xAxis} columns={availableColumns} onChange={setXAxis} />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-medium text-[#949494] uppercase tracking-wider">Y-axis</label>
                        <button onClick={addYAxis} className="text-[10px] text-[#5A7B8F] hover:text-[#FFFFFF]">
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
                              <button onClick={() => removeYAxis(idx)} className="text-[10px] text-[#666] hover:text-[hsl(0,84%,60%)] shrink-0">
                                x
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-medium text-[#949494] uppercase tracking-wider block mb-1">Color by</label>
                      <AxisMapper label="" value={series} columns={availableColumns} onChange={setSeries} optional />
                    </div>
                  </>
                )}

                {chartType === "BigValue" && (
                  <div>
                    <label className="text-[10px] font-medium text-[#949494] uppercase tracking-wider block mb-1">Value</label>
                    <AxisMapper label="" value={yAxes[0] ?? ""} columns={availableColumns} onChange={(v) => setYAxes([v])} />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-medium text-[#949494] uppercase tracking-wider block mb-1">Format</label>
                  <FormatPicker label="" value={format} onChange={setFormat} />
                </div>
              </div>
            )}

            {/* Right: Live Chart Preview */}
            <div className="flex-1 min-w-0 overflow-y-auto p-4">
              <LiveChartPreview
                variant={selectedVariant}
                data={queryResult?.rows ?? []}
                xAxis={xAxis}
                yAxes={yAxes}
                series={series}
                format={format}
              />
            </div>
          </div>

          {/* Code view — always mounted, hidden via CSS */}
          <div className={`min-h-[400px] overflow-auto ${bottomView !== "code" ? "hidden" : ""}`}>
            <pre className="p-4 text-[12px] text-[#949494] font-mono whitespace-pre-wrap break-words leading-[1.6]">
              {mdxOutput || "// Add queries and charts to generate MDX"}
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
