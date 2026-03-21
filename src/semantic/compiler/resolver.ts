import type {
  SemanticView,
  SemanticDimension,
  SemanticMeasure,
  SemanticRelationship,
  SemanticTopic,
  SemanticQuery,
  SemanticModel,
  CompilerWarning,
} from "../types";
import { compilerError } from "./errors";

// ─── Resolved field reference ────────────────────────────────────────────────

export interface ResolvedField {
  viewId: string;
  viewName: string;
  fieldName: string;
  alias: string;
}

export interface ResolvedDimension extends ResolvedField {
  dimension: SemanticDimension;
}

export interface ResolvedMeasure extends ResolvedField {
  measure: SemanticMeasure;
}

export interface ResolvedContext {
  topic: SemanticTopic;
  baseView: SemanticView;
  viewsById: Map<string, SemanticView>;
  viewsByName: Map<string, SemanticView>;
  relationships: SemanticRelationship[];
  resolvedDimensions: ResolvedDimension[];
  resolvedMeasures: ResolvedMeasure[];
  timeDimension: ResolvedDimension | null;
  requiredViewIds: Set<string>;
  warnings: CompilerWarning[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findField(
  views: Map<string, SemanticView>,
  baseViewId: string,
  fieldRef: string,
  kind: "dimension" | "measure",
  visibleFields: string[],
): ResolvedDimension | ResolvedMeasure {
  const hasVisibility = visibleFields.length > 0;

  // Qualified: view_name.field_name
  if (fieldRef.includes(".")) {
    const dotIdx = fieldRef.indexOf(".");
    const viewName = fieldRef.slice(0, dotIdx);
    const fieldName = fieldRef.slice(dotIdx + 1);
    const view = views.get(viewName);
    if (!view) {
      compilerError("INVALID_FIELD", {
        message: `View "${viewName}" not found for field "${fieldRef}"`,
        details: { field: fieldRef, availableFields: [...views.keys()] },
      });
    }
    const field = kind === "dimension"
      ? view.dimensions.find((d) => d.name === fieldName)
      : view.measures.find((m) => m.name === fieldName);
    if (!field) {
      const available = kind === "dimension"
        ? view.dimensions.map((d) => `${viewName}.${d.name}`)
        : view.measures.map((m) => `${viewName}.${m.name}`);
      compilerError("INVALID_FIELD", {
        message: `${kind} "${fieldName}" not found on view "${viewName}"`,
        details: { field: fieldRef, availableFields: available },
      });
    }
    const qualifiedName = `${viewName}.${field.name}`;
    if (hasVisibility && !visibleFields.includes(qualifiedName) && !visibleFields.includes(field.name)) {
      compilerError("INVALID_FIELD", {
        message: `Field "${qualifiedName}" is not visible in this topic`,
        details: { field: fieldRef, availableFields: visibleFields },
      });
    }
    const alias = `${viewName}__${field.name}`;
    if (kind === "dimension") {
      return { viewId: view.id, viewName, fieldName: field.name, alias, dimension: field as SemanticDimension };
    }
    return { viewId: view.id, viewName, fieldName: field.name, alias, measure: field as SemanticMeasure };
  }

  // Unqualified: search base view first, then others
  const matches: Array<{ view: SemanticView; field: SemanticDimension | SemanticMeasure }> = [];

  const orderedViews = [...views.values()].sort((a, b) => {
    if (a.id === baseViewId) return -1;
    if (b.id === baseViewId) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const view of orderedViews) {
    const field = kind === "dimension"
      ? view.dimensions.find((d) => d.name === fieldRef)
      : view.measures.find((m) => m.name === fieldRef);
    if (field) {
      matches.push({ view, field });
    }
  }

  if (matches.length === 0) {
    const allFields = orderedViews.flatMap((v) =>
      kind === "dimension"
        ? v.dimensions.map((d) => `${v.name}.${d.name}`)
        : v.measures.map((m) => `${v.name}.${m.name}`),
    );
    compilerError("INVALID_FIELD", {
      message: `${kind} "${fieldRef}" not found on any view`,
      details: { field: fieldRef, availableFields: allFields },
    });
  }

  if (matches.length > 1) {
    const baseMatch = matches.find((m) => m.view.id === baseViewId);
    if (baseMatch) {
      matches.splice(0, matches.length, baseMatch);
    } else {
      const locations = matches.map((m) => `${m.view.name}.${m.field.name}`);
      compilerError("INVALID_FIELD", {
        message: `Ambiguous field "${fieldRef}" found on multiple views: ${locations.join(", ")}. Use qualified form (view_name.field_name)`,
        details: { field: fieldRef, availableFields: locations },
      });
    }
  }

  const { view, field } = matches[0]!;
  const qualifiedName = `${view.name}.${field.name}`;
  if (hasVisibility && !visibleFields.includes(qualifiedName) && !visibleFields.includes(fieldRef)) {
    compilerError("INVALID_FIELD", {
      message: `Field "${qualifiedName}" is not visible in this topic`,
      details: { field: fieldRef, availableFields: visibleFields },
    });
  }

  const alias = `${view.name}__${field.name}`;
  if (kind === "dimension") {
    return { viewId: view.id, viewName: view.name, fieldName: field.name, alias, dimension: field as SemanticDimension };
  }
  return { viewId: view.id, viewName: view.name, fieldName: field.name, alias, measure: field as SemanticMeasure };
}

// ─── Main resolver ───────────────────────────────────────────────────────────

export function resolve(
  query: SemanticQuery,
  model: SemanticModel,
): ResolvedContext {
  const warnings: CompilerWarning[] = [];

  // 1. Find topic
  let topic = model.topics.get(query.topicId);

  // Fallback: try as a view name (auto-create topic)
  if (!topic) {
    const view = model.views.get(query.topicId);
    if (!view) {
      compilerError("INVALID_TOPIC", {
        message: `Topic or view "${query.topicId}" not found`,
        details: { topicId: query.topicId },
      });
    }
    // Synthesize a minimal topic from the view
    topic = {
      id: `topic:${view.name}`,
      name: view.name,
      label: view.label ?? view.name,
      description: view.description,
      baseViewId: view.id,
      allowedJoins: [],
      visibleFields: [],
      defaultTimeDimension: undefined,
      defaultTimeGrain: undefined,
      joinPolicy: "strict",
      fanoutAllowlist: [],
      sampleQuestions: [],
    };
    warnings.push({
      code: "DEPRECATED_ENTITY",
      message: `No topic found for "${query.topicId}" — compiled from view directly`,
      severity: "warning",
    });
  }

  // 2. Find base view
  const baseView = findViewById(model, topic.baseViewId);
  if (!baseView) {
    compilerError("INVALID_TOPIC", {
      message: `Base view "${topic.baseViewId}" not found for topic "${topic.name}"`,
      details: { topicId: query.topicId },
    });
  }

  // 3. Load relationships from topic's allowedJoins
  const allowedRelIds = new Set<string>();
  for (const aj of topic.allowedJoins) {
    if (typeof aj === "string") {
      // Find relationship by name
      const rel = model.relationships.find((r) => r.name === aj || r.id === aj);
      if (rel) allowedRelIds.add(rel.id);
    } else {
      const rel = model.relationships.find((r) => r.name === aj.relationshipId || r.id === aj.relationshipId);
      if (rel) allowedRelIds.add(rel.id);
    }
  }

  // If topic has no explicit allowedJoins and joinPolicy is permissive, allow all
  let relationships: SemanticRelationship[];
  if (topic.allowedJoins.length === 0) {
    relationships = model.relationships.filter(
      (r) => r.fromViewId === baseView.id || r.toViewId === baseView.id,
    );
  } else {
    relationships = model.relationships.filter((r) => allowedRelIds.has(r.id));
  }

  // 4. Collect all reachable views
  const reachableViewIds = new Set<string>([baseView.id]);
  for (const rel of relationships) {
    reachableViewIds.add(rel.fromViewId);
    reachableViewIds.add(rel.toViewId);
  }

  // Build lookup maps
  const viewsById = new Map<string, SemanticView>();
  const viewsByName = new Map<string, SemanticView>();
  for (const viewId of reachableViewIds) {
    const v = findViewById(model, viewId);
    if (v) {
      viewsById.set(v.id, v);
      viewsByName.set(v.name, v);
    }
  }

  // 5. Resolve field references
  const visibleFields = topic.visibleFields ?? [];

  const resolvedDimensions: ResolvedDimension[] = query.dimensions.map(
    (ref) => findField(viewsByName, baseView.id, ref, "dimension", visibleFields) as ResolvedDimension,
  );

  const resolvedMeasures: ResolvedMeasure[] = query.measures.map(
    (ref) => findField(viewsByName, baseView.id, ref, "measure", visibleFields) as ResolvedMeasure,
  );

  // 6. Determine required view IDs (beyond base)
  const requiredViewIds = new Set<string>();
  for (const rd of resolvedDimensions) {
    if (rd.viewId !== baseView.id) requiredViewIds.add(rd.viewId);
  }
  for (const rm of resolvedMeasures) {
    if (rm.viewId !== baseView.id) requiredViewIds.add(rm.viewId);
  }

  // 7. Resolve time dimension
  let timeDimension: ResolvedDimension | null = null;
  const requestedTimeDim = resolvedDimensions.find((rd) => rd.dimension.isTimeDimension);
  if (requestedTimeDim) {
    timeDimension = requestedTimeDim;
  } else if (topic.defaultTimeDimension && (query.dateRange || query.timeGrain)) {
    try {
      timeDimension = findField(
        viewsByName, baseView.id, topic.defaultTimeDimension, "dimension", visibleFields,
      ) as ResolvedDimension;
    } catch {
      // Default time dimension is invalid — skip
    }
  }

  return {
    topic,
    baseView,
    viewsById,
    viewsByName,
    relationships,
    resolvedDimensions,
    resolvedMeasures,
    timeDimension,
    requiredViewIds,
    warnings,
  };
}

function findViewById(model: SemanticModel, viewId: string): SemanticView | undefined {
  // Try by id first, then by name-based id
  for (const view of model.views.values()) {
    if (view.id === viewId || view.name === viewId) return view;
  }
  return undefined;
}
