"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSpec } from "@/lib/types";

export function ChartBlock({ spec }: { spec: ChartSpec }) {
  const Chart = spec.type === "line" ? LineChart : BarChart;

  return (
    <figure className="my-12 break-inside-avoid">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <figcaption className="font-serif text-lg leading-snug text-foreground">
            {spec.title}
          </figcaption>
          {spec.description ? (
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              {spec.description}
            </p>
          ) : null}
        </div>
        <div className="h-72 px-3 py-4 sm:px-5">
          <ResponsiveContainer width="100%" height="100%">
            <Chart data={spec.data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "currentColor", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fill: "currentColor", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                domain={[0, spec.yMax ?? "auto"]}
                width={36}
              />
              <Tooltip
                cursor={{ fill: "currentColor", fillOpacity: 0.04 }}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              {spec.type === "line" ? (
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-brand)"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "var(--color-brand)" }}
                />
              ) : (
                <Bar
                  dataKey="value"
                  fill="var(--color-brand)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={56}
                />
              )}
            </Chart>
          </ResponsiveContainer>
        </div>
      </div>
    </figure>
  );
}
