import { describe, it, expect } from "vitest";
import path from "path";

describe("page save path validation", () => {
  const pagesDir = "/tmp/test-pages";

  function isValidPagePath(pagePath: string): boolean {
    const resolvedBase = path.resolve(pagesDir);
    const resolvedPage = path.resolve(pagesDir, pagePath);
    return resolvedPage.startsWith(resolvedBase + path.sep) || resolvedPage === resolvedBase;
  }

  it("allows simple page names", () => {
    expect(isValidPagePath("index")).toBe(true);
    expect(isValidPagePath("dashboard")).toBe(true);
  });

  it("allows nested paths", () => {
    expect(isValidPagePath("analysis/growth")).toBe(true);
  });

  it("rejects path traversal", () => {
    expect(isValidPagePath("../../etc/passwd")).toBe(false);
    expect(isValidPagePath("../secret")).toBe(false);
  });

  it("rejects paths that escape via prefix tricks", () => {
    // /tmp/test-pages-secret would start with /tmp/test-pages but is outside
    expect(isValidPagePath("../test-pages-secret/file")).toBe(false);
  });
});
