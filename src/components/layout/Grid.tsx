"use client";

import React from "react";

interface GridProps {
  cols?: number;
  gap?: number;
  children: React.ReactNode;
}

export function Grid({ cols = 2, gap = 16, children }: GridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap,
      }}
    >
      {children}
    </div>
  );
}
