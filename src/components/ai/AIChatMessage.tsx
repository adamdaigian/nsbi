import React from "react";

interface AIChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function AIChatMessage({ role, content }: AIChatMessageProps) {
  // Extract MDX code blocks from assistant messages
  const mdxMatch = content.match(/```(?:mdx)?\s*\n([\s\S]*?)```/);
  const mdxCode = mdxMatch?.[1];
  const textContent = mdxMatch
    ? content.replace(/```(?:mdx)?\s*\n[\s\S]*?```/, "").trim()
    : content;

  return (
    <div className={`flex gap-2 ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-[1.5] ${
          role === "user"
            ? "bg-[rgba(90,123,143,0.15)] text-[#FFFFFF]"
            : "bg-[rgba(64,64,64,0.15)] text-[#FFFFFF]"
        }`}
      >
        {textContent && (
          <div className="whitespace-pre-wrap">{textContent}</div>
        )}
        {mdxCode && (
          <div className="mt-2">
            <div className="flex items-center justify-between px-2 py-1 rounded-t bg-[rgba(64,64,64,0.3)] text-[10px] text-[#949494]">
              <span>MDX</span>
            </div>
            <pre className="overflow-x-auto rounded-b bg-[rgba(0,0,0,0.3)] p-2 text-[11px] text-[#949494] font-mono">
              <code>{mdxCode}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
