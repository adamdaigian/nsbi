import React, { useState, useCallback, useRef, useEffect } from "react";
import { ChartBuilder } from "./ChartBuilder";
import { CodeEditor } from "./CodeEditor";
import { MDXSync } from "@/builder/sync";
import { pageSpecToMDX } from "@/builder/codegen";
import { mdxToPageSpec } from "@/builder/parse-mdx";
import type { PageSpec } from "@/builder/types";

interface SplitEditorProps {
  initialMDX?: string;
  onSave?: (mdx: string) => void;
}

export function SplitEditor({ initialMDX = "", onSave }: SplitEditorProps) {
  const syncRef = useRef(new MDXSync());
  const [mdxContent, setMDXContent] = useState(initialMDX);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When code editor changes, debounce sync to builder
  const handleCodeChange = useCallback((newMDX: string) => {
    setMDXContent(newMDX);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Parse MDX → PageSpec
      // The builder will pick up changes through shared state
      syncRef.current.applyMDXChange(newMDX);
    }, 300);
  }, []);

  return (
    <div className="flex h-full min-h-0">
      {/* Left: Visual Builder */}
      <div className="flex-1 min-w-0 border-r border-[rgba(148,148,148,0.12)]">
        <ChartBuilder />
      </div>

      {/* Right: Code Editor */}
      <div className="w-[400px] shrink-0">
        <CodeEditor
          value={mdxContent}
          onChange={handleCodeChange}
        />
      </div>
    </div>
  );
}
