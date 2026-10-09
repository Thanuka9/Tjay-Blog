export const CHART_TYPES = [
  { value: "bar", label: "Bar" },
  { value: "horizontal-bar", label: "Horizontal bar" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "pie", label: "Pie" },
  { value: "donut", label: "Donut" },
] as const;

export type ChartType = (typeof CHART_TYPES)[number]["value"];

export type ChartPalette = "teal" | "coral" | "gold" | "ocean" | "ink" | "mixed";

export type ChartRow = {
  name: string;
  value: number;
  value2?: number;
  value3?: number;
  color?: string;
};

export type ChartSpec = {
  type: ChartType | "horizontalBar";
  title: string;
  description?: string;
  unit?: string;
  yMin?: number;
  yMax?: number;
  color?: string;
  palette?: ChartPalette;
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  showValues?: boolean;
  showDots?: boolean;
  curved?: boolean;
  stacked?: boolean;
  height?: number;
  seriesLabels?: string[];
  data: ChartRow[];
};

export const CHART_PALETTES: { id: ChartPalette; label: string; colors: string[] }[] = [
  {
    id: "teal",
    label: "Teal",
    colors: ["#2a6b62", "#4d9a8f", "#7dc4b8", "#1d4e47", "#b8e0d8"],
  },
  {
    id: "coral",
    label: "Coral",
    colors: ["#c45c4a", "#d4896a", "#8f3d32", "#e8b298", "#a94436"],
  },
  {
    id: "gold",
    label: "Gold",
    colors: ["#b45309", "#d97706", "#92400e", "#f59e0b", "#fbbf24"],
  },
  {
    id: "ocean",
    label: "Ocean",
    colors: ["#1e3a5f", "#3d5a80", "#5c7a9e", "#98c1d9", "#293241"],
  },
  {
    id: "ink",
    label: "Ink",
    colors: ["#1c1917", "#44403c", "#78716c", "#a8a29e", "#d6d3d1"],
  },
  {
    id: "mixed",
    label: "Mixed",
    colors: ["#2a6b62", "#c45c4a", "#b45309", "#3d5a80", "#6d597a"],
  },
];

export const DEFAULT_CHART_COLORS = CHART_PALETTES[0].colors;

export function isChartType(value: string): value is ChartType {
  return CHART_TYPES.some((item) => item.value === value);
}

export function isChartSpec(value: unknown): value is ChartSpec {
  if (!value || typeof value !== "object") return false;
  const spec = value as Record<string, unknown>;
  if (typeof spec.title !== "string" || typeof spec.type !== "string" ||
      (!isChartType(spec.type) && spec.type !== "horizontalBar") || !Array.isArray(spec.data)) return false;
  if (!spec.data.every((row: unknown) => {
    if (!row || typeof row !== "object") return false;
    const item = row as Record<string, unknown>;
    return typeof item.name === "string" && typeof item.value === "number" && Number.isFinite(item.value) &&
      ["value2", "value3"].every((key) => item[key] == null || (typeof item[key] === "number" && Number.isFinite(item[key])));
  })) return false;
  return ["description", "unit", "color", "palette"].every((key) => spec[key] == null || typeof spec[key] === "string") &&
    ["height", "yMin", "yMax"].every((key) => spec[key] == null || (typeof spec[key] === "number" && Number.isFinite(spec[key]))) &&
    ["colors", "seriesLabels"].every((key) => spec[key] == null || (Array.isArray(spec[key]) && spec[key].every((item) => typeof item === "string")));
}

export function normalizeChartType(type: ChartSpec["type"]): ChartType {
  if (type === "horizontalBar") return "horizontal-bar";
  return isChartType(type) ? type : "bar";
}

export function normalizeChartSpec(spec: ChartSpec): ChartSpec {
  const type = normalizeChartType(spec.type);
  const palette = CHART_PALETTES.find((item) => item.id === spec.palette);
  const colors =
    spec.colors?.length
      ? spec.colors
      : spec.color
        ? [spec.color, ...(palette?.colors.slice(1) ?? DEFAULT_CHART_COLORS.slice(1))]
        : palette?.colors ?? DEFAULT_CHART_COLORS;
  return {
    ...spec,
    type,
    color: spec.color || colors[0],
    colors,
    showGrid: spec.showGrid ?? true,
    showLegend: spec.showLegend ?? spec.data.some((row) => row.value2 != null),
    showValues: spec.showValues ?? false,
    showDots: spec.showDots ?? true,
    curved: spec.curved ?? true,
    stacked: spec.stacked ?? false,
    height: Math.min(640, Math.max(180, spec.height ?? 288)),
  };
}

export function chartColor(spec: ChartSpec, index = 0) {
  const row = spec.data[index];
  if (row?.color) return row.color;
  const colors = spec.colors?.length ? spec.colors : DEFAULT_CHART_COLORS;
  return colors[index % colors.length] || spec.color || DEFAULT_CHART_COLORS[0];
}

export function parseChartRows(text: string): ChartRow[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",").map((part) => part.trim());
      const name = parts[0] ?? "";
      const nums = parts.slice(1, 4).map((value) => value === "" ? NaN : Number(value));
      const row: ChartRow = { name, value: nums[0] ?? NaN };
      if (Number.isFinite(nums[1])) row.value2 = nums[1];
      if (Number.isFinite(nums[2])) row.value3 = nums[2];
      return row;
    })
    .filter((row) => row.name && Number.isFinite(row.value));
}

export function hasSecondSeries(data: ChartRow[]) {
  return data.some((row) => row.value2 != null);
}

export function hasThirdSeries(data: ChartRow[]) {
  return data.some((row) => row.value3 != null);
}

export function colorForIndex(spec: ChartSpec, index: number) {
  return chartColor(normalizeChartSpec(spec), index);
}

export function primaryChartColor(spec: ChartSpec) {
  return chartColor(normalizeChartSpec(spec), 0);
}

export function resolveChartColors(spec: ChartSpec) {
  return normalizeChartSpec(spec).colors ?? DEFAULT_CHART_COLORS;
}
