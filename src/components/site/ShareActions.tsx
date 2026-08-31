"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/site/PrintButton";

export function ShareActions() {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <PrintButton />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full px-3.5"
        onClick={async () => {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        }}
      >
        {copied ? <Check /> : <Link2 />}
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
