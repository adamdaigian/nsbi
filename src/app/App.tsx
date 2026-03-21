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
      <div className="flex min-h-screen bg-[#0A0B0B] text-[#FFFFFF]">
        {/* Sidebar */}
        <Sidebar
          currentPage={currentPage}
          onNavigate={navigateTo}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Mobile header with hamburger + schema toggle */}
          <div className="flex items-center gap-3 px-6 py-4 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-[#949494] hover:bg-[rgba(64,64,64,0.15)] hover:text-[#FFFFFF]"
              aria-label="Open navigation"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>

          {/* Desktop toolbar */}
          {!isStatic && (
            <div className="hidden lg:flex items-center gap-1 px-6 pt-4 justify-end">
              <button
                onClick={() => setSchemaOpen(!schemaOpen)}
                className={`rounded-md p-1.5 transition-colors ${schemaOpen ? "bg-[rgba(90,123,143,0.15)] text-[#5A7B8F]" : "text-[#949494] hover:bg-[rgba(64,64,64,0.15)] hover:text-[#FFFFFF]"}`}
                aria-label="Toggle schema explorer"
                title="Schema Explorer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75m16.5 3.75v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75" />
                </svg>
              </button>
              <button
                onClick={() => setAIChatOpen(!aiChatOpen)}
                className={`rounded-md p-1.5 transition-colors ${aiChatOpen ? "bg-[rgba(90,123,143,0.15)] text-[#5A7B8F]" : "text-[#949494] hover:bg-[rgba(64,64,64,0.15)] hover:text-[#FFFFFF]"}`}
                aria-label="Toggle AI assistant"
                title="AI Assistant"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </button>
              <div className="w-px h-4 bg-[rgba(148,148,148,0.12)] mx-1" />
              <button
                onClick={() => setBuilderMode(!builderMode)}
                className={`rounded-md px-2 py-1 text-[11px] transition-colors ${builderMode ? "bg-[rgba(90,123,143,0.15)] text-[#5A7B8F]" : "text-[#949494] hover:bg-[rgba(64,64,64,0.15)] hover:text-[#FFFFFF]"}`}
                title="Visual Builder"
              >
                Builder
              </button>
            </div>
          )}

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
                <div className="hidden lg:block w-[280px] shrink-0 border-l border-[rgba(148,148,148,0.12)] h-[calc(100vh-64px)] sticky top-0 overflow-hidden">
                  <SchemaExplorer />
                </div>
              </SchemaProvider>
            )}

            {/* AI Chat Drawer */}
            {!isStatic && aiChatOpen && (
              <div className="hidden lg:block w-[340px] shrink-0 border-l border-[rgba(148,148,148,0.12)] h-[calc(100vh-64px)] sticky top-0 overflow-hidden">
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
