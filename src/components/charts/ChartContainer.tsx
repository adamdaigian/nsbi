"use client";

import React from "react";
import { ChartError } from "./ChartError";
import { ChartErrorBoundary } from "./ChartErrorBoundary";

interface ChartContainerProps {
  title?: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  error?: string;
  empty?: boolean;
  children?: React.ReactNode;
}

/**
 * Shared wrapper for every chart component. Handles chrome (title, subtitle),
 * loading / error / empty states, and applies the Northstar surface styling.
 */
export function ChartContainer({
  title,
  subtitle,
  height = 400,
  loading = false,
  error,
  empty = false,
  children,
}: ChartContainerProps) {
  return (
    <div
      className="rounded-[8px] bg-[#0A0B0B] border border-[rgba(148,148,148,0.12)] overflow-hidden"
    >
      {(title || subtitle) && (
        <div className="px-4 pt-4 pb-0">
          {title && (
            <h3 className="text-[14px] font-semibold leading-[1.4] text-[#FFFFFF] m-0">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-[12px] leading-[1.4] text-[#949494] m-0 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div className="min-w-0 overflow-hidden p-4" style={{ minHeight: height }}>
        {loading ? (
          <div
            className="flex items-center justify-center"
            style={{ height }}
          >
            <svg
              className="animate-spin h-6 w-6 text-[#949494]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          </div>
        ) : error ? (
          <div
            className="flex items-center justify-center"
            style={{ height }}
          >
            <ChartError message={error} />
          </div>
        ) : empty ? (
          <div
            className="flex items-center justify-center text-[13px] text-[#949494]"
            style={{ height }}
          >
            No data
          </div>
        ) : (
          <ChartErrorBoundary height={height}>{children}</ChartErrorBoundary>
        )}
      </div>
    </div>
  );
}
