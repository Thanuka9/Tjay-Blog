import type { Metadata } from "next";
import Link from "next/link";
import { Container, Kicker } from "@/components/site/layout";
import { SubscribeForm } from "@/components/site/SubscribeForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: site.description,
};

export default function AboutPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <Kicker>The publication</Kicker>
          <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">
            About {site.name}
          </h1>
          <div className="mt-8 space-y-6 text-[1.0625rem] leading-[1.8] text-foreground/90">
            <p>
              An assay is a test. It measures what is actually in a sample, not
              what the label promises. That is the job of this site.
            </p>
            <p>
              Longevity culture moves fast. A compound can go from a lab notebook
              to a TikTok caption in a week, and from a caption to an injection in
              a month. The research does not move that fast. We write in the
              space between those two speeds.
            </p>
            <p>
              We are not against peptides, supplements, or ambitious science.
              Insulin is a peptide. GLP-1 drugs are peptides. Both changed medicine
              because someone did the slow work: dosing, manufacturing, side
              effects, human trials. We will say so when that work exists. We
              will also say so when it does not.
            </p>
            <p>
              {site.name} is not medical advice, and it is not a substitute for a
              clinician who knows your history. It is a place to read the
              evidence with the conflicts of interest and the regulatory record
              still attached.
            </p>
          </div>
        </div>
        <aside className="lg:col-span-5">
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 lg:sticky lg:top-28">
            <h2 className="font-serif text-2xl tracking-tight">How to read us</h2>
            <ul className="mt-5 space-y-4 text-sm leading-6 text-muted-foreground">
              <li>Every claim is scored against published evidence, not a caption.</li>
              <li>Sources are linked in the piece, then listed at the end.</li>
              <li>Regulation is part of the science, not a footnote.</li>
            </ul>
            <div className="mt-8 border-t border-border pt-6">
              <p className="mb-4 text-sm text-muted-foreground">
                Get the next piece when it is finished.
              </p>
              <SubscribeForm />
              <p className="mt-4 text-xs text-muted-foreground">
                Editors start at the{" "}
                <Link href="/admin" className="underline hover:text-foreground">
                  dashboard
                </Link>
                .
              </p>
            </div>
          </div>
        </aside>
      </div>
    </Container>
  );
}
