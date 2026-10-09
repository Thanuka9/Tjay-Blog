import Link from "next/link";
import { Container, Kicker } from "@/components/site/layout";
import { site } from "@/lib/site";
export const metadata = { title: "Corrections" };
export default function CorrectionsPage() {
  const email = process.env.EDITORIAL_EMAIL || site.correctionsEmail;
  return (
    <Container className="py-14">
      <Kicker>The publication</Kicker>
      <h1 className="mt-4 font-serif text-5xl">Corrections</h1>
      <div className="journal-policy">
        <p>
          We welcome specific, source-backed corrections. Include the article
          title or number, the passage in question, and the evidence that
          supports your proposed correction.
        </p>
        {email && (
          <p>
            <a className="underline" href={`mailto:${email}`}>
              Contact the editorial team
            </a>
          </p>
        )}
        <p>
          Material corrections are recorded within the affected article. The
          online article and newly generated PDFs are updated from the same
          source.
        </p>
        <Link className="underline" href="/editorial-standards">
          Read our editorial standards
        </Link>
      </div>
    </Container>
  );
}
