"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  chartColor,
  hasSecondSeries,
  hasThirdSeries,
  normalizeChartSpec,
  type ChartSpec,
} from "@/lib/charts";
import { cn } from "@/lib/utils";

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 13,
};

export function ChartBlock({
  spec,
  compact = false,
}: {
  spec: ChartSpec;
  compact?: boolean;
}) {
  const chart = normalizeChartSpec(spec);
  const height = compact ? Math.min(chart.height ?? 288, 224) : (chart.height ?? 288);
  const dual = hasSecondSeries(chart.data);
  const triple = hasThirdSeries(chart.data);
  const series = [
    { key: "value", label: chart.seriesLabels?.[0] || "Value", color: chartColor(chart, 0) },
    ...(dual
      ? [
          {
            key: "value2",
            label: chart.seriesLabels?.[1] || "Series 2",
            color: chartColor(chart, 1),
          },
        ]
      : []),
    ...(triple
      ? [
          {
            key: "value3",
            label: chart.seriesLabels?.[2] || "Series 3",
            color: chartColor(chart, 2),
          },
        ]
      : []),
  ];
  const pie = chart.type === "pie" || chart.type === "donut";
  const horizontal = chart.type === "horizontal-bar";
  const curve = chart.curved ? "monotone" : "linear";

  return (
    <figure className={cn("break-inside-avoid", compact ? "my-0" : "my-12")}>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <figcaption className="font-serif text-lg leading-snug text-foreground">
            {chart.title}
          </figcaption>
          {chart.description ? (
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              {chart.description}
            </p>
          ) : null}
        </div>
        <div className="px-3 py-4 sm:px-5" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {pie ? (
              <PieChart>
                <Pie
                  data={chart.data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={chart.type === "donut" ? "58%" : 0}
                  outerRadius="80%"
                  paddingAngle={1}
                  label={chart.showValues}
                >
                  {chart.data.map((row, index) => (
                    <Cell key={row.name} fill={chartColor(chart, index)} />
                  ))}
                </Pie>
                {chart.showLegend ? <Legend /> : null}
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            ) : chart.type === "line" ? (
              <LineChart data={chart.data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                {chart.showGrid ? (
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                ) : null}
                <XAxis dataKey="name" tick={{ fill: "currentColor", fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
                <YAxis
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[chart.yMin ?? 0, chart.yMax ?? "auto"]}
                  width={40}
                  unit={chart.unit ? ` ${chart.unit}` : undefined}
                />
                <Tooltip contentStyle={tooltipStyle} />
                {chart.showLegend && dual ? <Legend /> : null}
                {series.map((item) => (
                  <Line
                    key={item.key}
                    type={curve}
                    dataKey={item.key}
                    name={item.label}
                    stroke={item.color}
                    strokeWidth={2.5}
                    dot={chart.showDots === false ? false : { r: 3.5, fill: item.color }}
                  />
                ))}
              </LineChart>
            ) : chart.type === "area" ? (
              <AreaChart data={chart.data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                {chart.showGrid ? (
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                ) : null}
                <XAxis dataKey="name" tick={{ fill: "currentColor", fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
                <YAxis
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[chart.yMin ?? 0, chart.yMax ?? "auto"]}
                  width={40}
                />
                <Tooltip contentStyle={tooltipStyle} />
                {chart.showLegend && dual ? <Legend /> : null}
                {series.map((item) => (
                  <Area
                    key={item.key}
                    type={curve}
                    dataKey={item.key}
                    name={item.label}
                    stroke={item.color}
                    fill={item.color}
                    fillOpacity={0.22}
                    strokeWidth={2}
                    stackId={chart.stacked ? "stack" : undefined}
                  />
                ))}
              </AreaChart>
            ) : (
              <BarChart
                data={chart.data}
                layout={horizontal ? "vertical" : "horizontal"}
                margin={{ top: 8, right: 8, left: horizontal ? 8 : 0, bottom: 4 }}
              >
                {chart.showGrid ? (
                  <CartesianGrid
                    stroke="currentColor"
                    strokeOpacity={0.08}
                    vertical={horizontal}
                    horizontal={!horizontal}
                  />
                ) : null}
                {horizontal ? (
                  <>
                    <XAxis type="number" tick={{ fill: "currentColor", fontSize: 11 }} tickLine={false} axisLine={false} domain={[chart.yMin ?? 0, chart.yMax ?? "auto"]} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "currentColor", fontSize: 11 }} tickLine={false} axisLine={false} width={88} />
                  </>
                ) : (
                  <>
                    <XAxis dataKey="name" tick={{ fill: "currentColor", fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
                    <YAxis
                      tick={{ fill: "currentColor", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[chart.yMin ?? 0, chart.yMax ?? "auto"]}
                      width={40}
                    />
                  </>
                )}
                <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.04 }} contentStyle={tooltipStyle} />
                {chart.showLegend && dual ? <Legend /> : null}
                {series.map((item, index) => (
                  <Bar
                    key={item.key}
                    dataKey={item.key}
                    name={item.label}
                    fill={item.color}
                    radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]}
                    maxBarSize={56}
                    stackId={chart.stacked ? "stack" : undefined}
                  >
                    {chart.showValues ? (
                      <LabelList dataKey={item.key} position={horizontal ? "right" : "top"} fontSize={11} />
                    ) : null}
                    {!dual && index === 0
                      ? chart.data.map((row, rowIndex) => (
                          <Cell key={`${row.name}-${rowIndex}`} fill={chartColor(chart, rowIndex)} />
                        ))
                      : null}
                  </Bar>
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        {chart.unit ? (
          <p className="border-t border-border px-5 py-2 text-xs text-muted-foreground">
            Units: {chart.unit}
          </p>
        ) : null}
      </div>
    </figure>
  );
}
