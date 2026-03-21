import type {
  SemanticRelationship,
  CardinalityType,
  JoinType,
  CompilerWarning,
} from "../types";
import type { ResolvedContext } from "./resolver";
import { compilerError } from "./errors";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GraphEdge {
  relationship: SemanticRelationship;
  targetViewId: string;
  effectiveCardinality: CardinalityType;
  effectiveJoinType: JoinType;
  reversed: boolean;
  weight: number;
}

export interface JoinPlan {
  edges: JoinPlanEdge[];
  warnings: CompilerWarning[];
}

export interface JoinPlanEdge {
  relationship: SemanticRelationship;
  fromViewId: string;
  toViewId: string;
  joinType: JoinType;
  cardinality: CardinalityType;
  reversed: boolean;
}

// ─── Cardinality helpers ─────────────────────────────────────────────────────

const CARDINALITY_WEIGHTS: Record<CardinalityType, number> = {
  "one-to-one": 1,
  "many-to-one": 2,
  "one-to-many": 10,
  "many-to-many": 100,
};

function flipCardinality(c: CardinalityType): CardinalityType {
  switch (c) {
    case "one-to-many": return "many-to-one";
    case "many-to-one": return "one-to-many";
    default: return c;
  }
}

function flipJoinType(j: JoinType): JoinType {
  switch (j) {
    case "LEFT": return "RIGHT";
    case "RIGHT": return "LEFT";
    default: return j;
  }
}

function isFanout(c: CardinalityType): boolean {
  return c === "one-to-many" || c === "many-to-many";
}

// ─── Graph construction ──────────────────────────────────────────────────────

function buildAdjacency(
  relationships: SemanticRelationship[],
): Map<string, GraphEdge[]> {
  const adj = new Map<string, GraphEdge[]>();
  const ensure = (id: string) => {
    if (!adj.has(id)) adj.set(id, []);
  };

  for (const rel of relationships) {
    ensure(rel.fromViewId);
    ensure(rel.toViewId);

    // Forward direction
    adj.get(rel.fromViewId)!.push({
      relationship: rel,
      targetViewId: rel.toViewId,
      effectiveCardinality: rel.cardinality,
      effectiveJoinType: rel.joinType,
      reversed: false,
      weight: CARDINALITY_WEIGHTS[rel.cardinality],
    });

    // Reverse direction
    const flippedCard = flipCardinality(rel.cardinality);
    adj.get(rel.toViewId)!.push({
      relationship: rel,
      targetViewId: rel.fromViewId,
      effectiveCardinality: flippedCard,
      effectiveJoinType: flipJoinType(rel.joinType),
      reversed: true,
      weight: CARDINALITY_WEIGHTS[flippedCard],
    });
  }

  return adj;
}

// ─── Dijkstra's shortest path ────────────────────────────────────────────────

function dijkstra(
  adj: Map<string, GraphEdge[]>,
  source: string,
  target: string,
): Array<{ edges: GraphEdge[]; totalWeight: number }> {
  const dist = new Map<string, number>();
  const prev = new Map<string, Array<{ via: GraphEdge; fromViewId: string }>>();
  const visited = new Set<string>();

  dist.set(source, 0);
  const queue: string[] = [source];

  while (queue.length > 0) {
    queue.sort((a, b) => (dist.get(a) ?? Infinity) - (dist.get(b) ?? Infinity));
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const currentDist = dist.get(current) ?? Infinity;
    const edges = adj.get(current) ?? [];

    for (const edge of edges) {
      const newDist = currentDist + edge.weight;
      const existingDist = dist.get(edge.targetViewId) ?? Infinity;

      if (newDist < existingDist) {
        dist.set(edge.targetViewId, newDist);
        prev.set(edge.targetViewId, [{ via: edge, fromViewId: current }]);
        if (!visited.has(edge.targetViewId)) {
          queue.push(edge.targetViewId);
        }
      } else if (newDist === existingDist) {
        const existing = prev.get(edge.targetViewId) ?? [];
        existing.push({ via: edge, fromViewId: current });
        prev.set(edge.targetViewId, existing);
      }
    }
  }

  if (!dist.has(target)) return [];

  const paths: Array<{ edges: GraphEdge[]; totalWeight: number }> = [];

  function reconstruct(viewId: string, edgesSoFar: GraphEdge[]): void {
    if (viewId === source) {
      paths.push({
        edges: [...edgesSoFar].reverse(),
        totalWeight: dist.get(target) ?? Infinity,
      });
      return;
    }
    const prevEntries = prev.get(viewId);
    if (!prevEntries) return;
    for (const entry of prevEntries) {
      reconstruct(entry.fromViewId, [...edgesSoFar, entry.via]);
    }
  }

  reconstruct(target, []);
  return paths;
}

// ─── Join planner ────────────────────────────────────────────────────────────

export function planJoins(resolved: ResolvedContext): JoinPlan {
  if (resolved.requiredViewIds.size === 0) {
    return { edges: [], warnings: [] };
  }

  const warnings: CompilerWarning[] = [];
  const adj = buildAdjacency(resolved.relationships);
  const baseViewId = resolved.baseView.id;

  // Build fanout allowlist
  const fanoutAllowedRelIds = new Set<string>();
  for (const aj of resolved.topic.allowedJoins ?? []) {
    if (typeof aj !== "string" && aj.fanoutAllowed) {
      fanoutAllowedRelIds.add(aj.relationshipId);
    }
  }
  const fanoutAllowedViewNames = new Set(resolved.topic.fanoutAllowlist ?? []);

  const allPlanEdges: JoinPlanEdge[] = [];
  const usedEdgeKeys = new Set<string>();

  for (const targetViewId of resolved.requiredViewIds) {
    const paths = dijkstra(adj, baseViewId, targetViewId);

    if (paths.length === 0) {
      const targetView = resolved.viewsById.get(targetViewId);
      compilerError("NO_JOIN_PATH", {
        message: `No join path from "${resolved.baseView.name}" to "${targetView?.name ?? targetViewId}"`,
        details: { baseView: resolved.baseView.name, targetView: targetView?.name ?? targetViewId },
      });
    }

    if (paths.length > 1) {
      const targetView = resolved.viewsById.get(targetViewId);
      const pathDescs = paths.map((p) =>
        p.edges.map((e) => {
          const fromView = resolved.viewsById.get(e.reversed ? e.relationship.toViewId : e.relationship.fromViewId);
          const toView = resolved.viewsById.get(e.targetViewId);
          return `${fromView?.name ?? "?"} -> ${toView?.name ?? "?"}`;
        }).join(" -> "),
      );
      compilerError("AMBIGUOUS_JOIN_PATH", {
        message: `Multiple join paths from "${resolved.baseView.name}" to "${targetView?.name ?? targetViewId}"`,
        details: { paths: pathDescs },
      });
    }

    const path = paths[0]!;

    for (const edge of path.edges) {
      if (isFanout(edge.effectiveCardinality)) {
        const relId = edge.relationship.id;
        const targetView = resolved.viewsById.get(edge.targetViewId);
        const targetViewName = targetView?.name ?? edge.targetViewId;

        const allowed =
          fanoutAllowedRelIds.has(relId) ||
          fanoutAllowedViewNames.has(targetViewName);

        if (!allowed) {
          compilerError("FANOUT_BLOCKED", {
            message: `Join to "${targetViewName}" via "${edge.relationship.name}" has ${edge.effectiveCardinality} cardinality`,
            details: {
              relationship: edge.relationship.name,
              cardinality: edge.effectiveCardinality,
              targetView: targetViewName,
            },
          });
        }

        warnings.push({
          code: "FANOUT_RISK",
          message: `Join to "${targetViewName}" has ${edge.effectiveCardinality} cardinality — aggregations may produce inflated results`,
          severity: "warning",
        });
      }
    }

    for (const edge of path.edges) {
      const sourceViewId = edge.reversed ? edge.relationship.toViewId : edge.relationship.fromViewId;
      const edgeKey = `${sourceViewId}->${edge.targetViewId}::${edge.relationship.id}`;
      if (!usedEdgeKeys.has(edgeKey)) {
        usedEdgeKeys.add(edgeKey);
        allPlanEdges.push({
          relationship: edge.relationship,
          fromViewId: sourceViewId,
          toViewId: edge.targetViewId,
          joinType: edge.effectiveJoinType,
          cardinality: edge.effectiveCardinality,
          reversed: edge.reversed,
        });
      }
    }
  }

  return { edges: allPlanEdges, warnings };
}
