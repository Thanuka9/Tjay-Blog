"use client";

import { useEffect, useMemo, useState } from "react";
import { ChartBlock } from "@/components/article/ChartBlock";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  CHART_PALETTES,
  CHART_TYPES,
  DEFAULT_CHART_COLORS,
  parseChartRows,
  type ChartType,
} from "@/lib/charts";
import { cn } from "@/lib/utils";

export function ChartBuilder({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (block: string) => void;
}) {
  const [title, setTitle] = useState("Untitled chart");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [type, setType] = useState<ChartType>("bar");
  const [rows, setRows] = useState(
    "Collagen peptides, 7\nBPC-157, 2\nGHK-Cu injectable, 1.5",
  );
  const [colors, setColors] = useState<string[]>([...DEFAULT_CHART_COLORS]);
  const [showGrid, setShowGrid] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [showValues, setShowValues] = useState(false);
  const [showDots, setShowDots] = useState(true);
  const [curved, setCurved] = useState(true);
  const [stacked, setStacked] = useState(false);
  const [yMin, setYMin] = useState("");
  const [yMax, setYMax] = useState("");
  const [height, setHeight] = useState("288");
  const [series2, setSeries2] = useState("Series 2");
  const [series3, setSeries3] = useState("Series 3");

  useEffect(() => {
    if (!open) return;
    setTitle("Untitled chart");
    setDescription("");
    setUnit("");
    setType("bar");
    setRows("Collagen peptides, 7\nBPC-157, 2\nGHK-Cu injectable, 1.5");
    setColors([...DEFAULT_CHART_COLORS]);
    setShowGrid(true);
    setShowLegend(false);
    setShowValues(false);
    setShowDots(true);
    setCurved(true);
    setStacked(false);
    setYMin("");
    setYMax("");
    setHeight("288");
    setSeries2("Series 2");
    setSeries3("Series 3");
  }, [open]);

  const spec = useMemo(() => {
    const data = parseChartRows(rows);
    const yMinNum = yMin === "" ? undefined : Number(yMin);
    const yMaxNum = yMax === "" ? undefined : Number(yMax);
    const heightNum = Number(height);
    return {
      type,
      title: title.trim() || "Untitled chart",
      description: description.trim() || undefined,
      unit: unit.trim() || undefined,
      yMin: yMinNum != null && Number.isFinite(yMinNum) ? yMinNum : undefined,
      yMax: yMaxNum != null && Number.isFinite(yMaxNum) ? yMaxNum : undefined,
      color: colors[0],
      colors,
      showGrid,
      showLegend,
      showValues,
      showDots,
      curved,
      stacked,
      height: Number.isFinite(heightNum) ? heightNum : 288,
      seriesLabels: ["Value", series2, series3],
      data,
    };
  }, [
    colors,
    curved,
    description,
    height,
    rows,
    series2,
    series3,
    showGrid,
    showLegend,
    showValues,
    showDots,
    stacked,
    title,
    type,
    unit,
    yMax,
    yMin,
  ]);

  function insert() {
    if (spec.data.length === 0) return;
    onInsert(`\n\n:::chart\n${JSON.stringify(spec)}\n:::\n\n`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Insert chart</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(value) => setType(value as ChartType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHART_TYPES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chart-unit">Units</Label>
                <Input
                  id="chart-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="%, score, mg"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="chart-title">Title</Label>
              <Input id="chart-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chart-desc">Caption</Label>
              <Input
                id="chart-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Colors</Label>
              <div className="flex flex-wrap gap-2">
                {CHART_PALETTES.map((palette) => (
                  <button
                    key={palette.id}
                    type="button"
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs",
                      colors.join() === palette.colors.join()
                        ? "border-foreground"
                        : "border-border",
                    )}
                    onClick={() => setColors([...palette.colors])}
                  >
                    <span className="mr-1.5 inline-flex gap-0.5 align-middle">
                      {palette.colors.slice(0, 4).map((color) => (
                        <span
                          key={color}
                          className="inline-block size-2.5 rounded-full"
                          style={{ background: color }}
                        />
                      ))}
                    </span>
                    {palette.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                {colors.slice(0, 5).map((color, index) => (
                  <label key={index} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="color"
                      value={color}
                      onChange={(event) => {
                        const next = [...colors];
                        next[index] = event.target.value;
                        setColors(next);
                      }}
                      className="size-7 cursor-pointer rounded border border-border bg-transparent p-0"
                    />
                    {index === 0 ? "Main" : index + 1}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle label="Grid" checked={showGrid} onChange={setShowGrid} />
              <Toggle label="Legend" checked={showLegend} onChange={setShowLegend} />
              <Toggle label="Value labels" checked={showValues} onChange={setShowValues} />
              <Toggle label="Dots on lines" checked={showDots} onChange={setShowDots} />
              <Toggle label="Smooth curves" checked={curved} onChange={setCurved} />
              <Toggle label="Stacked" checked={stacked} onChange={setStacked} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="chart-ymin">Y min</Label>
                <Input id="chart-ymin" value={yMin} onChange={(e) => setYMin(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chart-ymax">Y max</Label>
                <Input id="chart-ymax" value={yMax} onChange={(e) => setYMax(e.target.value)} placeholder="auto" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chart-height">Height</Label>
                <Input id="chart-height" value={height} onChange={(e) => setHeight(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="chart-s2">Second series name</Label>
                <Input id="chart-s2" value={series2} onChange={(e) => setSeries2(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chart-s3">Third series name</Label>
                <Input id="chart-s3" value={series3} onChange={(e) => setSeries3(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="chart-rows">Data (label, number — extra columns become more series)</Label>
              <textarea
                id="chart-rows"
                value={rows}
                onChange={(e) => setRows(e.target.value)}
                className="min-h-32 w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm"
              />
            </div>
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Preview
            </p>
            {spec.data.length > 0 ? (
              <ChartBlock spec={spec} compact />
            ) : (
              <p className="text-sm text-muted-foreground">Add at least one data row.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={insert} disabled={spec.data.length === 0}>
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
      <Label className="font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
