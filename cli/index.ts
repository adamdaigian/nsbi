import { cac } from "cac";
import { startDevServer } from "@/dev/server";
import { loadConfig } from "@/config/load-config";
import fs from "fs";
import path from "path";

const cli = cac("nsbi");

cli
  .command("dev", "Start the development server")
  .option("--port <port>", "Port to listen on", { default: 3000 })
  .option("--project <path>", "Project directory (contains pages/ and data/)", {
    default: ".",
  })
  .action(async (options: { port: number; project: string }) => {
    const config = await loadConfig(options.project);
    await startDevServer({
      port: Number(options.port),
      dir: options.project,
      config,
    });
  });

cli
  .command("init [name]", "Create a new nsbi project")
  .option("--template <name>", "Template to use (blank, saas-metrics, sales-pipeline, product-analytics)", { default: "blank" })
  .action(async (name: string | undefined, options: { template: string }) => {
    const projectName = name ?? "my-dashboard";
    const projectDir = path.resolve(projectName);
    const templateName = options.template;

    if (fs.existsSync(projectDir)) {
      console.error(`[nsbi] Directory already exists: ${projectName}`);
      process.exit(1);
    }

    // Locate template directory
    const templatesRoot = path.resolve(import.meta.dirname, "..", "templates");
    const templateDir = path.join(templatesRoot, templateName);

    if (!fs.existsSync(templateDir)) {
      const available = fs.readdirSync(templatesRoot).filter((d) =>
        fs.statSync(path.join(templatesRoot, d)).isDirectory(),
      );
      console.error(`[nsbi] Unknown template: ${templateName}`);
      console.error(`  Available: ${available.join(", ")}`);
      process.exit(1);
    }

    // Copy template to project directory
    copyDirSync(templateDir, projectDir, ["scripts", "node_modules"]);

    // Ensure data/ directory exists
    fs.mkdirSync(path.join(projectDir, "data"), { recursive: true });

    // Run data generator if it exists
    const generatorScript = path.join(templateDir, "scripts", "generate-data.ts");
    if (fs.existsSync(generatorScript)) {
      console.log(`  [nsbi] Generating sample data...`);
      const { execSync } = await import("child_process");
      try {
        execSync(`npx tsx "${generatorScript}"`, {
          cwd: projectDir,
          stdio: "inherit",
          env: { ...process.env },
        });
      } catch {
        console.warn("  [nsbi] Data generation failed — you can run it manually from scripts/");
      }
    }

    console.log(`\n  [nsbi] Created project: ${projectName}/ (template: ${templateName})`);
    console.log(`\n  Next steps:`);
    console.log(`    cd ${projectName}`);
    console.log(`    npx nsbi dev --project .\n`);
  });

cli
  .command("build", "Build for production")
  .option("--project <path>", "Project directory", { default: "." })
  .action(async (options: { project: string }) => {
    const config = await loadConfig(options.project);
    const projectDir = path.resolve(options.project);
    const pagesDir = path.join(projectDir, "pages");
    const dataDir = path.join(projectDir, config.data.dir);

    if (!fs.existsSync(pagesDir)) {
      console.error(`[nsbi] No pages/ directory found in ${projectDir}`);
      process.exit(1);
    }

    console.log("[nsbi] Building for production...");

    // 1. Initialize DuckDB and pre-execute all queries
    const { initDuckDB, executeQuery } = await import("@/engine/duckdb");
    const { parseDocument } = await import("@/engine/parser");

    if (fs.existsSync(dataDir)) {
      await initDuckDB(dataDir);
    }

    const outDir = path.resolve(config.build.outDir);
    const nsbiDataDir = path.join(outDir, "_nsbi_data");
    fs.mkdirSync(nsbiDataDir, { recursive: true });

    // 2. Scan all .mdx files, categorize queries, pre-execute static ones
    const mdxFiles = scanMdxFiles(pagesDir);
    let hasFilteredQueries = false;

    // Build page tree for sidebar
    const pageTree = scanPageTree(pagesDir, pagesDir);
    fs.writeFileSync(
      path.join(nsbiDataDir, "pages.json"),
      JSON.stringify({ pages: pageTree }),
    );

    for (const file of mdxFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const parsed = parseDocument(content);
      const pagePath = path.relative(pagesDir, file).replace(/\.mdx$/, "").replace(/\\/g, "/");

      const staticQueries = parsed.queries.filter((q) => !q.filterVariables?.length);
      const filteredQueriesOnPage = parsed.queries.filter((q) => q.filterVariables?.length);
      const pageHasFilters = filteredQueriesOnPage.length > 0;

      if (pageHasFilters) hasFilteredQueries = true;

      // Pre-execute static queries
      const queryResults: Record<string, { rows: Record<string, unknown>[]; columns: { name: string; type: string }[] }> = {};
      for (const query of staticQueries) {
        try {
          queryResults[query.name] = await executeQuery(query.sql);
        } catch (err) {
          console.warn(`[nsbi] Query "${query.name}" in ${pagePath} failed:`, err);
          queryResults[query.name] = { rows: [], columns: [] };
        }
      }

      // Write per-page JSON with MDX content + pre-rendered results
      const pageData = {
        content,
        queryResults,
        hasFilteredQueries: pageHasFilters,
      };

      // Ensure subdirectories exist for nested pages
      const pageJsonPath = path.join(nsbiDataDir, `${pagePath}.json`);
      fs.mkdirSync(path.dirname(pageJsonPath), { recursive: true });
      fs.writeFileSync(pageJsonPath, JSON.stringify(pageData));
      console.log(`  [nsbi] Pre-rendered: ${pagePath} (${staticQueries.length} static, ${filteredQueriesOnPage.length} filtered)`);
    }

    // 3. If any page has filters, copy data files + write manifest for WASM engine
    if (hasFilteredQueries && fs.existsSync(dataDir)) {
      console.log("  [nsbi] Copying data files for WASM engine...");
      const manifest: { files: { name: string; type: string }[] } = { files: [] };
      const dataFiles = fs.readdirSync(dataDir);

      for (const file of dataFiles) {
        const ext = path.extname(file).toLowerCase();
        let fileType: string | null = null;
        if (ext === ".db") fileType = "db";
        else if (ext === ".csv") fileType = "csv";
        else if (ext === ".parquet") fileType = "parquet";

        if (fileType) {
          fs.copyFileSync(
            path.join(dataDir, file),
            path.join(nsbiDataDir, file),
          );
          manifest.files.push({ name: file, type: fileType });
        }
      }

      fs.writeFileSync(
        path.join(nsbiDataDir, "manifest.json"),
        JSON.stringify(manifest),
      );
    }

    // 4. Run Vite build
    const { build } = await import("vite");
    const nsbiRoot = path.resolve(import.meta.dirname, "..");

    await build({
      root: nsbiRoot,
      base: config.basePath,
      build: { outDir },
      define: {
        __NSBI_STATIC__: "true",
        __NSBI_HAS_WASM__: hasFilteredQueries ? "true" : "false",
      },
    });

    // 5. Generate hosting helpers
    // Netlify: _redirects for SPA fallback
    fs.writeFileSync(
      path.join(outDir, "_redirects"),
      "/*    /index.html   200\n",
    );

    // Vercel: vercel.json for SPA fallback
    fs.writeFileSync(
      path.join(outDir, "vercel.json"),
      JSON.stringify({
        rewrites: [{ source: "/(.*)", destination: "/index.html" }],
      }, null, 2) + "\n",
    );

    const { closeDuckDB } = await import("@/engine/duckdb");
    await closeDuckDB();

    const bundleNote = hasFilteredQueries
      ? "(includes WASM for filtered queries)"
      : "(static only, no WASM needed)";
    console.log(`\n  [nsbi] Build complete → ${config.build.outDir}/ ${bundleNote}\n`);
  });

cli
  .command("preview", "Preview the production build")
  .option("--port <port>", "Port to listen on", { default: 4173 })
  .action(async (options: { port: number }) => {
    const distDir = path.resolve("dist");

    if (!fs.existsSync(distDir)) {
      console.error("[nsbi] No dist/ directory found. Run `nsbi build` first.");
      process.exit(1);
    }

    const { preview } = await import("vite");
    const nsbiRoot = path.resolve(import.meta.dirname, "..");

    const server = await preview({
      root: nsbiRoot,
      preview: { port: Number(options.port) },
      build: { outDir: distDir },
    });

    server.printUrls();
  });

cli.help();
cli.version("0.1.0");
cli.parse();

/**
 * Recursively scan a directory for .mdx files and build a page tree (for sidebar).
 */
interface PageTreeNode {
  name: string;
  path: string;
  children?: PageTreeNode[];
}

function scanPageTree(dir: string, rootDir: string): PageTreeNode[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const nodes: PageTreeNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const children = scanPageTree(fullPath, rootDir);
      if (children.length > 0) {
        nodes.push({
          name: entry.name,
          path: path.relative(rootDir, fullPath).replace(/\\/g, "/"),
          children,
        });
      }
    } else if (entry.name.endsWith(".mdx")) {
      const relativePath = path
        .relative(rootDir, fullPath)
        .replace(/\.mdx$/, "")
        .replace(/\\/g, "/");
      nodes.push({ name: path.basename(entry.name, ".mdx"), path: relativePath });
    }
  }

  nodes.sort((a, b) => {
    const aIsDir = !!a.children;
    const bIsDir = !!b.children;
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

/**
 * Recursively scan for .mdx files.
 */
function scanMdxFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanMdxFiles(full));
    } else if (entry.name.endsWith(".mdx")) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Recursively copy a directory, skipping specified directory names.
 */
function copyDirSync(src: string, dest: string, skipDirs: string[] = []) {
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (skipDirs.includes(entry.name)) continue;
      copyDirSync(srcPath, destPath, skipDirs);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
