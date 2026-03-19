import { format as dateFnsFormat } from "date-fns";

/**
 * Format a value using a named format string.
 *
 * Supported formats:
 *   usd0      – $1,234
 *   usd2      – $1,234.56
 *   pct       – 12.3%
 *   pct0      – 12%
 *   num0      – 1,234
 *   num2      – 1,234.56
 *   date      – Jan 1, 2025
 *   datetime  – Jan 1, 2025 3:45 PM
 *   string    – literal String(value)
 *
 * Falls back to `String(value)` for unknown formats or non-numeric input.
 */
export function formatValue(value: unknown, format?: string): string {
  if (value == null) return "";

  // Guard: non-primitive values should not go through String()
  if (typeof value === "object") {
    // Handle Date objects
    if (value instanceof Date) {
      if (format === "datetime") return dateFnsFormat(value, "MMM d, yyyy h:mm a");
      return dateFnsFormat(value, "MMM d, yyyy");
    }
    return JSON.stringify(value);
  }

  if (!format || format === "string") return `${value as string | number | boolean}`;

  // ---- Currency ----
  if (format === "usd0" || format === "usd2") {
    const num = Number(value);
    if (!Number.isFinite(num)) return `${value as string | number | boolean}`;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: format === "usd2" ? 2 : 0,
      maximumFractionDigits: format === "usd2" ? 2 : 0,
    }).format(num);
  }

  // ---- Percentages ----
  if (format === "pct" || format === "pct0") {
    const num = Number(value);
    if (!Number.isFinite(num)) return `${value as string | number | boolean}`;
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: format === "pct0" ? 0 : 1,
      maximumFractionDigits: format === "pct0" ? 0 : 1,
    }).format(num);
  }

  // ---- Numbers ----
  if (format === "num0" || format === "num2") {
    const num = Number(value);
    if (!Number.isFinite(num)) return `${value as string | number | boolean}`;
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: format === "num2" ? 2 : 0,
      maximumFractionDigits: format === "num2" ? 2 : 0,
    }).format(num);
  }

  // ---- Dates ----
  if (format === "month") {
    try {
      const d = new Date(value as string | number);
      return dateFnsFormat(d, "MMM yyyy");
    } catch {
      return `${value as string | number | boolean}`;
    }
  }

  if (format === "date") {
    try {
      const d = new Date(value as string | number);
      return dateFnsFormat(d, "MMM d, yyyy");
    } catch {
      return `${value as string | number | boolean}`;
    }
  }

  if (format === "datetime") {
    try {
      const d = new Date(value as string | number);
      return dateFnsFormat(d, "MMM d, yyyy h:mm a");
    } catch {
      return `${value as string | number | boolean}`;
    }
  }

  // Fallback
  return `${value as string | number | boolean}`;
}
