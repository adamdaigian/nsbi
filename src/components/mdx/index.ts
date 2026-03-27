export { QueryProvider, useQueryData } from "./QueryContext";
export { LineChart, BarChart, AreaChart } from "./charts";
export { KPI } from "./KPI";
export { MDXDataTable } from "./MDXDataTable";
export { Grid } from "./Grid";

import type { ComponentType } from "react";
import { LineChart, BarChart, AreaChart } from "./charts";
import { KPI } from "./KPI";
import { MDXDataTable } from "./MDXDataTable";
import { Grid } from "./Grid";

/** Component map passed to the MDX compiler */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mdxComponents: Record<string, ComponentType<any>> = {
  LineChart,
  BarChart,
  AreaChart,
  KPI,
  DataTable: MDXDataTable,
  Grid,
};
