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
      className="flex flex-col items-start gap-2 rounded-lg border border-[rgba(148,148,148,0.12)] bg-[rgba(64,64,64,0.05)] p-4 text-left hover:border-[rgba(90,123,143,0.3)] hover:bg-[rgba(64,64,64,0.1)] transition-all"
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(90,123,143,0.15)] text-[#5A7B8F]">
          {template.category}
        </span>
      </div>
      <h3 className="text-[14px] font-medium text-[#FFFFFF]">{template.name}</h3>
      <p className="text-[12px] text-[#949494] leading-[1.4]">{template.description}</p>
    </button>
  );
}
