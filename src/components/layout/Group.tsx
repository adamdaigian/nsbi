"use client";

import React from "react";

interface GroupProps {
  title?: string;
  children: React.ReactNode;
}

export function Group({ title, children }: GroupProps) {
  return (
    <section className="flex flex-col gap-4">
      {title && (
        <h4 className="text-[14px] font-medium leading-[1.4] text-foreground pl-3 border-l-2 border-primary">
          {title}
        </h4>
      )}
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
