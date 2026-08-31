"use client";

import { useState } from "react";
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
import type { ChartSpec } from "@/lib/types";

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
  const [type, setType] = useState<ChartSpec["type"]>("bar");
  const [rows, setRows] = useState("Collagen peptides, 7\nBPC-157, 2\nGHK-Cu injectable, 1.5");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Insert chart</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as ChartSpec["type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="line">Line</SelectItem>
              </SelectContent>
            </Select>
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
            <Label htmlFor="chart-rows">Data (label, number — one per line)</Label>
            <textarea
              id="chart-rows"
              value={rows}
              onChange={(e) => setRows(e.target.value)}
              className="min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              const data = rows
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                  const [name, value] = line.split(",").map((part) => part.trim());
                  return { name, value: Number(value) };
                })
                .filter((row) => row.name && Number.isFinite(row.value));
              const spec = {
                type,
                title,
                description: description || undefined,
                data,
              };
              onInsert(`\n\n:::chart\n${JSON.stringify(spec)}\n:::\n\n`);
              onOpenChange(false);
            }}
          >
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
