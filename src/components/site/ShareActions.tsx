"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/site/PrintButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ShareActions({
  slug,
  citations,
}: {
  slug: string;
  citations: { apa: string; vancouver: string; plain: string };
}) {
  const [style, setStyle] = useState<"apa" | "vancouver" | "plain">(
    "vancouver",
  );
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setMessage(
        "Copy is unavailable in this browser. Select and copy the text below.",
      );
    }
  }
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button asChild variant="outline" size="sm">
        <a href={`/articles/${slug}/download`} download>
          ↓ Download PDF
        </a>
      </Button>
      <PrintButton />
      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            Cite
          </Button>
        </DialogTrigger>
        <DialogContent className="journal-theme sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Cite this article</DialogTitle>
            <DialogDescription>
              Choose a citation style and copy it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            {(
              [
                ["apa", "APA"],
                ["vancouver", "Vancouver"],
                ["plain", "Plain text"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={style === value ? "default" : "outline"}
                aria-pressed={style === value}
                onClick={() => {
                  setStyle(value);
                  setMessage("");
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <p className="select-text border border-border p-4 leading-7">
            {citations[style]}
          </p>
          <Button type="button" onClick={() => void copy(citations[style])}>
            {copied ? "Copied" : "Copy citation"}
          </Button>
          {message && <p role="status">{message}</p>}
        </DialogContent>
      </Dialog>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={async () => {
          try {
            if (navigator.share)
              await navigator.share({
                title: document.title,
                url: window.location.href,
              });
            else await copy(window.location.href);
          } catch {
            /* Closing the native share dialog needs no message. */
          }
        }}
      >
        {copied ? "Copied" : "Share"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void copy(window.location.href)}
      >
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
