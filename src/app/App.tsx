import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardPage } from "./DashboardPage";
import { Sidebar } from "@/components/Sidebar";
import { EngineProvider } from "@/engine/EngineContext";
import { ServerQueryEngine } from "@/engine/server-engine";
import { LazyWasmEngine } from "@/engine/lazy-wasm-engine";
import type { QueryEngine } from "@/engine/query-engine";
import { SchemaProvider } from "@/components/schema/SchemaContext";
import { SchemaExplorer } from "@/components/schema/SchemaExplorer";
import { AIChatPanel } from "@/components/ai/AIChatPanel";
import { ChartBuilder } from "@/components/builder/ChartBuilder";


declare const __NSBI_STATIC__: boolean | undefined;
declare const __NSBI_HAS_WASM__: boolean | undefined;

function getPageFromHash(): string {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return hash || "index";
}

export function App() {
  const [currentPage, setCurrentPage] = useState(getPageFromHash);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [aiChatOpen, setAIChatOpen] = useState(false);
  const [builderMode, setBuilderMode] = useState(false);

  const isStatic = typeof __NSBI_STATIC__ !== "undefined" && __NSBI_STATIC__;

  const engine = useMemo<QueryEngine>(() => {
    const isStatic = typeof __NSBI_STATIC__ !== "undefined" && __NSBI_STATIC__;
    const hasWasm = typeof __NSBI_HAS_WASM__ !== "undefined" && __NSBI_HAS_WASM__;

    if (isStatic && hasWasm) {
      // LazyWasmEngine defers WASM init until first query
      return new LazyWasmEngine();
    }

    if (isStatic) {
      // Static-only mode: no WASM needed, but still need an engine for the interface.
      // Queries are pre-rendered; this engine is a no-op fallback.
      return {
        executeQuery: async () => {
          throw new Error("No query engine available in static-only mode");
        },
      };
    }

    // Dev mode
    return new ServerQueryEngine();
  }, []);

  useEffect(() => {
    const handleHashChange = () => setCurrentPage(getPageFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigateTo = useCallback((pagePath: string) => {
    window.location.hash = `#/${pagePath}`;
    setSidebarOpen(false);
  }, []);

  return (
    <EngineProvider engine={engine}>
      <div className="flex min-h-screen bg-background text-foreground">
        {/* Sidebar */}
        <Sidebar
          currentPage={currentPage}
          onNavigate={navigateTo}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
          schemaOpen={schemaOpen}
          onSchemaToggle={() => setSchemaOpen(!schemaOpen)}
          aiChatOpen={aiChatOpen}
          onAIChatToggle={() => setAIChatOpen(!aiChatOpen)}
          builderMode={builderMode}
          onBuilderToggle={() => setBuilderMode(!builderMode)}
          isStatic={isStatic}
        />

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Mobile header with hamburger + schema toggle */}
          <div className="flex items-center gap-3 px-6 py-4 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Open navigation"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>

          {/* spacer for content top padding on desktop */}
          <div className="hidden lg:block h-4" />

          {builderMode && !isStatic ? (
            <div className="h-[calc(100vh-64px)]">
              <ChartBuilder />
            </div>
          ) : (
          <div className="flex">
            <div className="mx-auto max-w-[1200px] px-6 py-8 flex-1 min-w-0">
              <DashboardPage key={currentPage} pagePath={currentPage} />
            </div>

            {/* Schema Explorer Drawer */}
            {!isStatic && schemaOpen && (
              <SchemaProvider>
                <div className="hidden lg:block w-[280px] shrink-0 border-l border-border h-[calc(100vh-64px)] sticky top-0 overflow-hidden">
                  <SchemaExplorer />
                </div>
              </SchemaProvider>
            )}

            {/* AI Chat Drawer */}
            {!isStatic && aiChatOpen && (
              <div className="hidden lg:block w-[340px] shrink-0 border-l border-border h-[calc(100vh-64px)] sticky top-0 overflow-hidden">
                <AIChatPanel />
              </div>
            )}
          </div>
          )}
        </main>
      </div>
    </EngineProvider>
  );
}
