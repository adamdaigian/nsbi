/**
 * Registry mapping component names (as used in MDX) to their React implementations.
 * Phase 2: charts + layout + input/filter components.
 */

import { withQueryData } from "./withQueryData";

import { LineChart } from "./charts/LineChart";
import { AreaChart } from "./charts/AreaChart";
import { BarChart } from "./charts/BarChart";
import { ScatterPlot } from "./charts/ScatterPlot";
import { DataTable } from "./charts/DataTable";
import { BigValue } from "./charts/BigValue";
import { Delta } from "./charts/Delta";
import { Sparkline } from "./charts/Sparkline";
import { EChartsRaw } from "./charts/EChartsRaw";
import { Grid } from "./layout/Grid";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./layout/Tabs";
import { Group } from "./layout/Group";
import { Divider } from "./layout/Divider";

import { FilterProvider } from "./inputs/FilterContext";
import { Dropdown } from "./inputs/Dropdown";
import { DateRange } from "./inputs/DateRange";
import { ButtonGroup } from "./inputs/ButtonGroup";
import { TextInput } from "./inputs/TextInput";
import { MultiSelect } from "./inputs/MultiSelect";
import { Slider } from "./inputs/Slider";
import { CheckboxFilter } from "./inputs/CheckboxFilter";
import { DateInput } from "./inputs/DateInput";

export const vizRegistry = {
  // Charts — wrapped to resolve string data props from QueryContext
  LineChart: withQueryData(LineChart),
  AreaChart: withQueryData(AreaChart),
  BarChart: withQueryData(BarChart),
  ScatterPlot: withQueryData(ScatterPlot),
  DataTable: withQueryData(DataTable),
  BigValue: withQueryData(BigValue),
  Sparkline: withQueryData(Sparkline),
  // These don't use the data pattern
  Delta,
  ECharts: EChartsRaw,
  // Layout
  Grid,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Group,
  Divider,
  // Inputs / Filters
  FilterProvider,
  Dropdown,
  DateRange,
  ButtonGroup,
  TextInput,
  MultiSelect,
  Slider,
  CheckboxFilter,
  DateInput,
} as const;
