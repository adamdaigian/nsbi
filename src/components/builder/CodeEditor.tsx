import React, { useRef, useEffect } from "react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
}

export function CodeEditor({ value, onChange, language = "mdx" }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle tab key for indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current!;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      onChange(newValue);
      // Restore cursor position
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-border/70 text-[10px] text-muted-foreground">
        {language.toUpperCase()}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 w-full bg-transparent p-3 text-[12px] text-foreground font-mono leading-[1.6] outline-none resize-none"
        spellCheck={false}
      />
    </div>
  );
}
