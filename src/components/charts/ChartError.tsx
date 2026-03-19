"use client";

import React from "react";

interface ChartErrorProps {
  message: string;
}

/**
 * Inline error display for chart components.
 */
export function ChartError({ message }: ChartErrorProps) {
  return (
    <div className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-[13px] leading-[1.4] text-[hsl(0,84%,60%)] bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.2)]">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
