import React, { useState, useCallback, useRef } from "react";
import { ChartBuilder } from "./ChartBuilder";
import { CodeEditor } from "./CodeEditor";
// TODO: reconnect after YAML config parser
// import { MDXSync } from "@/builder/sync";
// import { pageSpecToMDX } from "@/builder/codegen";
// import { mdxToPageSpec } from "@/builder/parse-mdx";
import type { PageSpec } from "@/builder/types";

interface SplitEditorProps {
  initialMDX?: string;
  onSave?: (mdx: string) => void;
}

export function SplitEditor({ initialMDX = "", onSave }: SplitEditorProps) {
  const [mdxContent, setMDXContent] = useState(initialMDX);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // TODO: reconnect after YAML config parser
  const handleCodeChange = useCallback((newMDX: string) => {
    setMDXContent(newMDX);
  }, []);

  return (
    <div className="flex h-full min-h-0">
      {/* Left: Visual Builder */}
      <div className="flex-1 min-w-0 border-r border-border">
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
