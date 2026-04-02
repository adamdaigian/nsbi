import React from "react";
import { cn } from "@/lib/utils";

export type AppMode = "dashboards" | "schema" | "chat";

interface HeaderProps {
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  isStatic?: boolean;
  onMobileMenuToggle?: () => void;
}

const NAV_ITEMS: { mode: AppMode; label: string; devOnly: boolean }[] = [
  { mode: "dashboards", label: "Dashboards", devOnly: false },
  { mode: "schema", label: "Schema", devOnly: true },
  { mode: "chat", label: "Chat", devOnly: true },
];

export function Header({ activeMode, onModeChange, isStatic, onMobileMenuToggle }: HeaderProps) {
  const visibleItems = isStatic
    ? NAV_ITEMS.filter((item) => !item.devOnly)
    : NAV_ITEMS;

  return (
    <header className="flex h-12 items-center justify-between border-b border-border px-4 bg-background shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger — only in dashboards mode */}
        {activeMode === "dashboards" && (
          <button
            onClick={onMobileMenuToggle}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
            aria-label="Open navigation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}
        <span className="text-sm font-bold text-foreground tracking-tight">Polaris</span>
      </div>

      <nav className="flex items-center gap-0.5">
        {visibleItems.map((item) => (
          <button
            key={item.mode}
            onClick={() => onModeChange(item.mode)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs transition-colors",
              activeMode === item.mode
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
