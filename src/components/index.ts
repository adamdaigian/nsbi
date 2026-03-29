// Charts

/** Renders a Vega-Lite chart specification with data, applying the Northstar theme. */
export { VegaChart } from './charts/VegaChart'
export type { VegaChartProps } from './charts/VegaChart'
/** Vega-Lite theme config and color palette for consistent chart styling. */
export { northstarTheme, CHART_COLORS } from './charts/vega-theme'

/** Minimal inline sparkline chart for visualizing trends in a single numeric field. */
export { Sparkline } from './charts/Sparkline'
/** Prominent single-value display with optional comparison delta and sparkline. */
export { BigValue } from './charts/BigValue'
/** Directional change indicator with arrow, color, and formatted value. */
export { Delta } from './charts/Delta'
/** Searchable, sortable, paginated data table rendered from an array of records. */
export { DataTable } from './charts/DataTable'

// Layout

/** CSS grid layout container with configurable columns and gap. */
export { Grid } from './layout/Grid'
/** Styled content section with optional left-bordered title. */
export { Group } from './layout/Group'
/** Composable tab navigation components (Tabs, TabsList, TabsTrigger, TabsContent). */
export { Tabs, TabsList, TabsTrigger, TabsContent } from './layout/Tabs'
/** Horizontal divider line for visual separation. */
export { Divider } from './layout/Divider'

// Inputs

/** Filter state management — provides reactive filter values to all child input components. */
export { FilterProvider, useFilterValue } from './inputs/FilterContext'
/** Single-select dropdown integrated with FilterProvider. */
export { Dropdown } from './inputs/Dropdown'
/** Multi-select dropdown with checkboxes and tag display, integrated with FilterProvider. */
export { MultiSelect } from './inputs/MultiSelect'
/** Radio-style button group for single selection, integrated with FilterProvider. */
export { ButtonGroup } from './inputs/ButtonGroup'
/** Text input field integrated with FilterProvider. */
export { TextInput } from './inputs/TextInput'
/** Numeric range slider with min/max bounds, integrated with FilterProvider. */
export { Slider } from './inputs/Slider'
/** Single date picker with calendar popover, integrated with FilterProvider. */
export { DateInput } from './inputs/DateInput'
/** Date range picker with preset shortcuts and calendar, integrated with FilterProvider. */
export { DateRange } from './inputs/DateRange'
/** Boolean checkbox control integrated with FilterProvider. */
export { CheckboxFilter } from './inputs/CheckboxFilter'
