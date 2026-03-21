import type { CompilerErrorCode } from "../types";

interface CompilerErrorOptions {
  message: string;
  details?: Record<string, unknown>;
}

export class SemanticCompilerError extends Error {
  code: CompilerErrorCode;
  details?: Record<string, unknown>;

  constructor(code: CompilerErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "SemanticCompilerError";
    this.code = code;
    this.details = details;
  }
}

const ERROR_HINTS: Record<CompilerErrorCode, (opts: CompilerErrorOptions) => string> = {
  INVALID_TOPIC: (opts) =>
    `${opts.message}. Ensure the topic exists in your models/ directory.`,
  INVALID_FIELD: (opts) => {
    const available = opts.details?.availableFields as string[] | undefined;
    const suffix = available?.length
      ? ` Available fields: ${available.join(", ")}`
      : "";
    return `${opts.message}.${suffix}`;
  },
  FANOUT_BLOCKED: (opts) =>
    `${opts.message}. One-to-many or many-to-many joins can produce duplicate rows and corrupt aggregations. ` +
    `To allow this join, set fanoutAllowed on the topic's allowedJoins entry.`,
  AMBIGUOUS_JOIN_PATH: (opts) => {
    const paths = opts.details?.paths as string[] | undefined;
    const pathList = paths?.length
      ? `\nPossible paths:\n${paths.map((p, i) => `  ${i + 1}. ${p}`).join("\n")}`
      : "";
    return `${opts.message}. Multiple equal-cost join paths exist between views.${pathList}\nRestrict the topic's allowedJoins to resolve the ambiguity.`;
  },
  NO_JOIN_PATH: (opts) =>
    `${opts.message}. No relationship path connects the base view to the required view. ` +
    `Add a relationship in _relationships.yml.`,
  CIRCULAR_DEPENDENCY: (opts) =>
    `${opts.message}. A derived measure references itself (directly or indirectly). ` +
    `Break the circular reference chain.`,
  INVALID_FILTER: (opts) =>
    `${opts.message}. Check the filter value and ensure it matches a supported shortcut or format.`,
  UNSUPPORTED_DIALECT: (opts) =>
    `${opts.message}. Supported dialects: duckdb.`,
};

export function compilerError(
  code: CompilerErrorCode,
  opts: CompilerErrorOptions,
): never {
  const formatted = ERROR_HINTS[code](opts);
  throw new SemanticCompilerError(code, formatted, opts.details);
}
