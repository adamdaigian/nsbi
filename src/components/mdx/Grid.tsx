"use client";

import React from "react";

interface GridProps {
  cols?: number;
  children: React.ReactNode;
}

export function Grid({ cols = 2, children }: GridProps) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}
