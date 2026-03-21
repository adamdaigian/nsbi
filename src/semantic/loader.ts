import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type {
  SemanticModel,
  SemanticView,
  SemanticDimension,
  SemanticMeasure,
  SemanticRelationship,
  SemanticTopic,
  AllowedJoin,
} from "./types";
import {
  yamlViewSchema,
  yamlRelationshipsFileSchema,
  yamlTopicsFileSchema,
} from "./types";

/**
 * Load semantic model from a models/ directory.
 * - Non-prefixed .yml files = views
 * - _relationships.yml = cross-view joins
 * - _topics.yml = queryable topic definitions
 */
export function loadSemanticModel(modelsDir: string): SemanticModel {
  const views = new Map<string, SemanticView>();
  const relationships: SemanticRelationship[] = [];
  const topics = new Map<string, SemanticTopic>();

  if (!fs.existsSync(modelsDir)) {
    return { views, relationships, topics };
  }

  const files = fs.readdirSync(modelsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

  // 1. Load view files (non-underscore prefixed)
  for (const file of files) {
    if (file.startsWith("_")) continue;
    const filePath = path.join(modelsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const raw = yaml.load(content);

    const parsed = yamlViewSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn(`[nsbi] Invalid view file ${file}:`, parsed.error.issues.map((i) => i.message).join(", "));
      continue;
    }

    const v = parsed.data;
    const viewId = `view:${v.name}`;

    const dimensions: SemanticDimension[] = v.dimensions.map((d, i) => ({
      id: `dim:${v.name}:${d.name}`,
      name: d.name,
      label: d.label,
      type: d.type,
      sqlExpression: d.sql,
      isTimeDimension: d.timeDimension,
      description: d.description,
    }));

    const measures: SemanticMeasure[] = v.measures.map((m, i) => ({
      id: `meas:${v.name}:${m.name}`,
      name: m.name,
      label: m.label,
      sqlExpression: m.sql,
      aggregateType: m.aggregate,
      format: m.format,
      filterSql: m.filter,
      isSemiAdditive: m.semiAdditive,
      description: m.description,
    }));

    const source = v.source as { table?: string; sql?: string };
    const view: SemanticView = {
      id: viewId,
      name: v.name,
      label: v.label,
      description: v.description,
      sourceTable: source.table,
      sourceType: source.sql ? "query" : "table",
      sourceQuery: source.sql,
      dimensions,
      measures,
      status: "active",
    };

    views.set(v.name, view);
  }

  // 2. Load relationships
  const relFile = files.find((f) => f === "_relationships.yml" || f === "_relationships.yaml");
  if (relFile) {
    const content = fs.readFileSync(path.join(modelsDir, relFile), "utf-8");
    const raw = yaml.load(content);

    const parsed = yamlRelationshipsFileSchema.safeParse(raw);
    if (parsed.success) {
      for (const r of parsed.data.relationships) {
        const fromView = views.get(r.from);
        const toView = views.get(r.to);
        if (!fromView || !toView) {
          console.warn(`[nsbi] Relationship "${r.name}": view "${!fromView ? r.from : r.to}" not found`);
          continue;
        }

        relationships.push({
          id: `rel:${r.name}`,
          name: r.name,
          fromViewId: fromView.id,
          toViewId: toView.id,
          cardinality: r.cardinality,
          joinType: r.joinType,
          joinConditions: r.on.map((c) => ({
            leftColumn: c.left,
            rightColumn: c.right,
          })),
        });
      }
    } else {
      console.warn(`[nsbi] Invalid _relationships.yml:`, parsed.error.issues.map((i) => i.message).join(", "));
    }
  }

  // 3. Load topics
  const topicFile = files.find((f) => f === "_topics.yml" || f === "_topics.yaml");
  if (topicFile) {
    const content = fs.readFileSync(path.join(modelsDir, topicFile), "utf-8");
    const raw = yaml.load(content);

    const parsed = yamlTopicsFileSchema.safeParse(raw);
    if (parsed.success) {
      for (const t of parsed.data.topics) {
        const baseView = views.get(t.baseView);
        if (!baseView) {
          console.warn(`[nsbi] Topic "${t.name}": base view "${t.baseView}" not found`);
          continue;
        }

        const allowedJoins: AllowedJoin[] = t.allowedJoins.map((aj) => {
          if (typeof aj === "string") {
            const rel = relationships.find((r) => r.name === aj);
            return { relationshipId: rel?.id ?? `rel:${aj}` };
          }
          const rel = relationships.find((r) => r.name === aj.relationship);
          return {
            relationshipId: rel?.id ?? `rel:${aj.relationship}`,
            fanoutAllowed: aj.fanoutAllowed,
          };
        });

        topics.set(t.name, {
          id: `topic:${t.name}`,
          name: t.name,
          label: t.label,
          description: t.description,
          baseViewId: baseView.id,
          allowedJoins,
          visibleFields: t.visibleFields,
          defaultTimeDimension: t.defaultTimeDimension,
          defaultTimeGrain: t.defaultTimeGrain,
          joinPolicy: "strict",
          fanoutAllowlist: [],
          sampleQuestions: t.sampleQuestions,
        });
      }
    } else {
      console.warn(`[nsbi] Invalid _topics.yml:`, parsed.error.issues.map((i) => i.message).join(", "));
    }
  }

  console.log(`[nsbi] Loaded semantic model: ${views.size} views, ${relationships.length} relationships, ${topics.size} topics`);
  return { views, relationships, topics };
}
