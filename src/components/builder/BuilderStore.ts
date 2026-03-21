import React, { createContext, useContext, useReducer, useCallback } from "react";
import type { PageSpec, QuerySpec, ChartSpec, ChartType } from "@/builder/types";

interface BuilderState {
  pageSpec: PageSpec;
  selectedChartId: string | null;
  previewDirty: boolean;
}

type BuilderAction =
  | { type: "SET_TITLE"; title: string }
  | { type: "SET_DESCRIPTION"; description: string }
  | { type: "ADD_QUERY"; query: QuerySpec }
  | { type: "UPDATE_QUERY"; name: string; query: QuerySpec }
  | { type: "REMOVE_QUERY"; name: string }
  | { type: "ADD_CHART"; chart: ChartSpec }
  | { type: "UPDATE_CHART"; chart: ChartSpec }
  | { type: "REMOVE_CHART"; id: string }
  | { type: "SELECT_CHART"; id: string | null }
  | { type: "SET_PAGE_SPEC"; spec: PageSpec }
  | { type: "MARK_CLEAN" };

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "SET_TITLE":
      return { ...state, pageSpec: { ...state.pageSpec, title: action.title }, previewDirty: true };
    case "SET_DESCRIPTION":
      return { ...state, pageSpec: { ...state.pageSpec, description: action.description }, previewDirty: true };
    case "ADD_QUERY":
      return { ...state, pageSpec: { ...state.pageSpec, queries: [...state.pageSpec.queries, action.query] }, previewDirty: true };
    case "UPDATE_QUERY":
      return {
        ...state,
        pageSpec: {
          ...state.pageSpec,
          queries: state.pageSpec.queries.map((q) => (q.name === action.name ? action.query : q)),
        },
        previewDirty: true,
      };
    case "REMOVE_QUERY":
      return {
        ...state,
        pageSpec: {
          ...state.pageSpec,
          queries: state.pageSpec.queries.filter((q) => q.name !== action.name),
        },
        previewDirty: true,
      };
    case "ADD_CHART":
      return {
        ...state,
        pageSpec: { ...state.pageSpec, layout: [...state.pageSpec.layout, action.chart] },
        selectedChartId: action.chart.id,
        previewDirty: true,
      };
    case "UPDATE_CHART":
      return {
        ...state,
        pageSpec: {
          ...state.pageSpec,
          layout: state.pageSpec.layout.map((item) =>
            "id" in item && item.id === action.chart.id ? action.chart : item,
          ),
        },
        previewDirty: true,
      };
    case "REMOVE_CHART":
      return {
        ...state,
        pageSpec: {
          ...state.pageSpec,
          layout: state.pageSpec.layout.filter((item) => !("id" in item && item.id === action.id)),
        },
        selectedChartId: state.selectedChartId === action.id ? null : state.selectedChartId,
        previewDirty: true,
      };
    case "SELECT_CHART":
      return { ...state, selectedChartId: action.id };
    case "SET_PAGE_SPEC":
      return { ...state, pageSpec: action.spec, previewDirty: true };
    case "MARK_CLEAN":
      return { ...state, previewDirty: false };
    default:
      return state;
  }
}

const defaultState: BuilderState = {
  pageSpec: { title: "New Dashboard", queries: [], layout: [] },
  selectedChartId: null,
  previewDirty: false,
};

interface BuilderContextValue {
  state: BuilderState;
  dispatch: React.Dispatch<BuilderAction>;
}

export const BuilderContext = createContext<BuilderContextValue>({
  state: defaultState,
  dispatch: () => {},
});

export function useBuilderStore() {
  return useContext(BuilderContext);
}

export function useBuilderReducer() {
  return useReducer(builderReducer, defaultState);
}

export function generateChartId(): string {
  return `chart_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
