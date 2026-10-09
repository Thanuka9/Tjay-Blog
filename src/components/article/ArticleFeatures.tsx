import { EVIDENCE_STAGES, type AtAGlance, type EvidenceLadder as Ladder } from "@/lib/types";

export function ArticleAtAGlance({ summary }: { summary?: AtAGlance | null }) {
  if (!summary) return null;
  return <section className="article-glance" aria-label="At a glance">
    <p className="journal-kicker uppercase">At a glance</p>
    <dl>
      {[["What we know", summary.known], ["What we don’t know", summary.unknown], ["What to watch", summary.watch]].map(([label, body]) =>
        <div key={label}><dt>{label}</dt><dd>{body}</dd></div>)}
    </dl>
  </section>;
}

export function EvidenceLadder({ ladder }: { ladder: Ladder }) {
  return <figure className="article-evidence" aria-label={`The evidence ladder: ${ladder.subject}`}>
    <p className="journal-kicker uppercase">The evidence ladder</p>
    <p className="evidence-subject">{ladder.subject}</p>
    <ol className="evidence-steps">
      {EVIDENCE_STAGES.map((stage, index) => <li key={stage} className={stage === ladder.stage ? "is-highlighted" : undefined}>
        <span className="evidence-bar" style={{ height: `${38 + index * 22}px` }} aria-hidden="true" />
        <span className="evidence-label">{stage}</span>
        {stage === ladder.stage && <span className="evidence-marker">Main evidence</span>}
      </li>)}
    </ol>
    <figcaption>{ladder.caption}</figcaption>
    <p className="evidence-note">Study design and quality matter at every stage. Regulatory approval is a separate assessment for a specific use.</p>
  </figure>;
}
