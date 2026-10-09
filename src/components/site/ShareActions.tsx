"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/site/PrintButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

type CopyTarget = "citation" | "link";
export function ShareActions({ slug, citations }: {
  slug: string;
  citations: { apa: string; vancouver: string; plain: string };
}) {
  const [style, setStyle] = useState<"apa" | "vancouver" | "plain">("vancouver");
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const [fallback, setFallback] = useState<{ target: CopyTarget; text: string } | null>(null);
  async function copy(text: string, target: CopyTarget) {
    setCopied(null);
    setFallback(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(target);
    } catch {
      setFallback({ target, text });
    }
  }
  return (
    <div className="article-actions print:hidden">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm"><a href={`/articles/${slug}/download`} download>Download PDF &darr;</a></Button>
        <PrintButton />
        <Dialog onOpenChange={() => { setCopied(null); setFallback(null); }}>
          <DialogTrigger asChild><Button type="button" variant="outline" size="sm">Cite</Button></DialogTrigger>
          <DialogContent className="journal-theme citation-dialog sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Cite this article</DialogTitle>
              <DialogDescription>Choose a citation style and copy it.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {([["apa", "APA"], ["vancouver", "Vancouver"], ["plain", "Plain text"]] as const).map(([value, label]) => (
                <Button key={value} type="button" size="sm" variant={style === value ? "default" : "outline"} aria-pressed={style === value}
                  onClick={() => { setStyle(value); setCopied(null); setFallback(null); }}>{label}</Button>
              ))}
            </div>
            <p className="citation-text select-text border border-border p-4 leading-7">{citations[style]}</p>
            <Button type="button" onClick={() => void copy(citations[style], "citation")}>{copied === "citation" ? "Citation copied" : "Copy citation"}</Button>
            <p role="status" className="text-sm">{fallback?.target === "citation" ? "Copy is unavailable. Select and copy the citation above." : copied === "citation" ? "Citation copied to clipboard." : ""}</p>
          </DialogContent>
        </Dialog>
        <Button type="button" size="sm" onClick={async () => {
          if (!navigator.share) { await copy(window.location.href, "link"); return; }
          try { await navigator.share({ title: document.title, url: window.location.href }); }
          catch (error) { if (!(error instanceof Error && error.name === "AbortError")) await copy(window.location.href, "link"); }
        }}>Share</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => void copy(window.location.href, "link")}>{copied === "link" ? "Link copied" : "Copy link"}</Button>
      </div>
      <p role="status" className="article-copy-status">{copied === "link" ? "Article link copied to clipboard." : fallback?.target === "link" ? "Copy is unavailable. Select and copy the article link below." : ""}</p>
      {fallback?.target === "link" && <input className="article-copy-fallback" aria-label="Article link to copy" readOnly value={fallback.text} onFocus={(event) => event.currentTarget.select()} />}
    </div>
  );
}
