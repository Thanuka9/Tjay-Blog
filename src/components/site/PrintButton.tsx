"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full px-3.5 print:hidden"
      onClick={() => window.print()}
    >
      <Printer />
      Print
    </Button>
  );
}
