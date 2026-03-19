"use client";

import React, { Component } from "react";

interface Props {
  children: React.ReactNode;
  height?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React error boundary for chart components. Catches render errors
 * and displays a styled fallback in the chart-sized container.
 */
export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex items-center justify-center rounded-[8px] bg-[#0A0B0B] border border-[rgba(148,148,148,0.12)]"
          style={{ minHeight: this.props.height ?? 200 }}
        >
          <div className="flex items-center gap-2 rounded-[6px] px-4 py-3 text-[13px] leading-[1.4] text-[hsl(0,84%,60%)] bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.2)] max-w-[90%]">
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
            <span>
              {this.state.error?.message ?? "An error occurred rendering this chart"}
            </span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
