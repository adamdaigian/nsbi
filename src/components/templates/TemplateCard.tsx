import React from "react";
import type { DashboardTemplate } from "@/templates/registry";

interface TemplateCardProps {
  template: DashboardTemplate;
  onClick: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  General: "grid",
  Analytics: "trending-up",
  Analysis: "bar-chart",
  Operations: "activity",
};

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-lg border border-border bg-muted/30 p-4 text-left hover:border-primary/30 hover:bg-accent transition-all"
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">
          {template.category}
        </span>
      </div>
      <h3 className="text-[14px] font-medium text-foreground">{template.name}</h3>
      <p className="text-[12px] text-muted-foreground leading-[1.4]">{template.description}</p>
    </button>
  );
}
