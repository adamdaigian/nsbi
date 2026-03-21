import React, { useState } from "react";
import { dashboardTemplates, type DashboardTemplate, type TemplateContext } from "@/templates/registry";
import { TemplateCard } from "./TemplateCard";
import { useSchema } from "@/components/schema/SchemaContext";

interface TemplatePickerProps {
  onSelect: (mdx: string) => void;
  onClose: () => void;
}

export function TemplatePicker({ onSelect, onClose }: TemplatePickerProps) {
  const { schema } = useSchema();
  const [selectedTable, setSelectedTable] = useState<string>(
    schema?.tables[0]?.name ?? "",
  );
  const [step, setStep] = useState<"template" | "table">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<DashboardTemplate | null>(null);

  const handleTemplateClick = (template: DashboardTemplate) => {
    if (schema && schema.tables.length > 0) {
      setSelectedTemplate(template);
      setStep("table");
    } else {
      // No schema — generate with defaults
      const mdx = template.generateMDX({});
      onSelect(mdx);
    }
  };

  const handleGenerate = () => {
    if (!selectedTemplate) return;
    const context: TemplateContext = { schema: schema ?? undefined, selectedTable };
    const mdx = selectedTemplate.generateMDX(context);
    onSelect(mdx);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[600px] max-h-[500px] rounded-lg bg-background border border-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-[14px] font-semibold text-foreground">
            {step === "template" ? "New from Template" : `Select Table for "${selectedTemplate?.name}"`}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === "template" && (
            <div className="grid grid-cols-2 gap-3">
              {dashboardTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onClick={() => handleTemplateClick(template)}
                />
              ))}
            </div>
          )}

          {step === "table" && (
            <div className="space-y-3">
              <p className="text-[12px] text-muted-foreground">
                Choose a table to generate the dashboard from:
              </p>
              <div className="space-y-1">
                {schema?.tables.map((table) => (
                  <button
                    key={table.name}
                    onClick={() => setSelectedTable(table.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-left text-[13px] transition-colors ${
                      selectedTable === table.name
                        ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                        : "text-foreground hover:bg-accent"
                    }`}
                  >
                    <span>{table.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {table.columns.length} cols, {table.rowCount.toLocaleString()} rows
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "table" && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <button
              onClick={() => setStep("template")}
              className="text-[12px] text-muted-foreground hover:text-foreground"
            >
              Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={!selectedTable}
              className="px-3 py-1.5 rounded text-[12px] bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-50 transition-colors"
            >
              Generate Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
