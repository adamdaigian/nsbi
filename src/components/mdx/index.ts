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
import { Group } from "@/components/layout/Group";
import { Divider } from "@/components/layout/Divider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/layout/Tabs";

/** Component map passed to the MDX compiler */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mdxComponents: Record<string, ComponentType<any>> = {
  LineChart,
  BarChart,
  AreaChart,
  KPI,
  DataTable: MDXDataTable,
  Grid,
  Group,
  Divider,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
};
