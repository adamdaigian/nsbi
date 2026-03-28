import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";

declare const __NSBI_STATIC__: boolean | undefined;

interface PageNode {
  name: string;
  path: string;
  children?: PageNode[];
}

interface SidebarProps {
  currentPage: string;
  onNavigate: (path: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  schemaOpen?: boolean;
  onSchemaToggle?: () => void;
  aiChatOpen?: boolean;
  onAIChatToggle?: () => void;
  builderMode?: boolean;
  onBuilderToggle?: () => void;
  isStatic?: boolean;
}

export function Sidebar({ currentPage, onNavigate, mobileOpen, onMobileClose, schemaOpen, onSchemaToggle, aiChatOpen, onAIChatToggle, builderMode, onBuilderToggle, isStatic }: SidebarProps) {
  const [pages, setPages] = useState<PageNode[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const fetchPages = useCallback(async () => {
    try {
      const url = isStatic ? "/_nsbi_data/pages.json" : "/api/pages";
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as { pages: PageNode[] };
        setPages(data.pages);
      }
    } catch {
      // silently fail — sidebar just won't show pages
    }
  }, [isStatic]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const toggleCollapse = (dirPath: string) => {
    setCollapsed((prev) => ({ ...prev, [dirPath]: !prev[dirPath] }));
  };

  const PAGE_LABELS: Record<string, string> = {
    "index": "Executive Metrics (L0)",
    "channel-analysis": "Channel Analysis (L1)",
    "key-drivers": "Key Drivers (L2)",
  };

  const formatName = (name: string) => {
    if (PAGE_LABELS[name]) return PAGE_LABELS[name];
    return name
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const renderNode = (node: PageNode, depth: number = 0) => {
    if (node.children) {
      const isCollapsed = collapsed[node.path] ?? false;
      return (
        <div key={node.path}>
          <button
            onClick={() => toggleCollapse(node.path)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            style={{ paddingLeft: `${12 + depth * 12}px` }}
          >
            <svg
              className={cn("h-3 w-3 shrink-0 transition-transform", !isCollapsed && "rotate-90")}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            {formatName(node.name)}
          </button>
          {!isCollapsed && (
            <div>
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const isActive = currentPage === node.path;
    return (
      <button
        key={node.path}
        onClick={() => onNavigate(node.path)}
        className={cn(
          "flex w-full items-center rounded-md px-3 py-1.5 text-left text-xs transition-colors",
          isActive
            ? "bg-primary/15 font-medium text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
      >
        {formatName(node.name)}
      </button>
    );
  };

  const hasMultiplePages = pages.length > 1 || pages.some((p) => p.children);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-border bg-background transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo / Brand */}
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className="text-sm font-semibold text-foreground tracking-tight">nsbi</span>
        </div>

        {/* Tool buttons */}
        {!isStatic && (
          <div className="flex items-center gap-1 px-3 py-3 border-b border-border">
            <button
              onClick={onSchemaToggle}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] transition-colors",
                schemaOpen ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              title="Schema Explorer"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75m16.5 3.75v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75" />
              </svg>
              Schema
            </button>
            <button
              onClick={onAIChatToggle}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] transition-colors",
                aiChatOpen ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              title="AI Assistant"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              Chat
            </button>
            <button
              onClick={onBuilderToggle}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] transition-colors",
                builderMode ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              title="Visual Builder"
            >
              Builder
            </button>
          </div>
        )}

        {/* Pages navigation */}
        {hasMultiplePages && (
          <nav className="flex-1 overflow-y-auto p-3">
            <p className="px-3 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pages</p>
            <div className="flex flex-col gap-0.5">
              {pages.map((node) => renderNode(node))}
            </div>
          </nav>
        )}
        {!hasMultiplePages && <div className="flex-1" />}

        {/* Theme switcher */}
        <div className="border-t border-border px-3 py-3">
          <ThemeSwitcher />
        </div>
      </aside>
    </>
  );
}
