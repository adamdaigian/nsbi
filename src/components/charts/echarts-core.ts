/**
 * Tree-shaken ECharts core. Only registers the chart types and components
 * actually used by nsbi, reducing bundle from ~1MB to ~300KB.
 */
import * as echarts from "echarts/core";
import { LineChart, BarChart, ScatterChart } from "echarts/charts";
import {
  TooltipComponent,
  LegendComponent,
  GridComponent,
  TitleComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  LineChart,
  BarChart,
  ScatterChart,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  TitleComponent,
  CanvasRenderer,
]);

export default echarts;
