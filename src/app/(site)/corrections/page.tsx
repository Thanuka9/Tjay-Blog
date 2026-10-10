import { Container } from "@/components/site/layout";
import { site } from "@/lib/site";

export const metadata = { title: "Corrections" };

export default function CorrectionsPage() {
  const email = process.env.EDITORIAL_EMAIL || site.correctionsEmail;

  return (
    <Container className="py-12 pb-20">
      <p className="m-0 text-[13px] font-semibold tracking-[0.14em] text-[#1C6670] uppercase">
        The Abyss
      </p>
      <h1 className="mt-3 font-serif text-[clamp(36px,5vw,56px)] font-medium leading-[1.1] tracking-[-0.01em] text-[#0E1C3B]">
        Corrections
      </h1>
      <p className="mt-5 max-w-[720px] font-serif text-[22px] leading-[1.5] italic text-[#4A5163]">
        A public record of every error we have fixed after publication.
      </p>

      <div className="mt-10 max-w-[720px] border-t border-[#D9D2C3] pt-8 font-serif text-xl leading-[1.7] text-[#141A2E]">
        <p className="m-0">
          When we get something wrong, we correct the article in place, add a dated note at the
          bottom of it, and list the change here with what was wrong and what it now says. Spotted
          an error?{" "}
          {email ? (
            <>
              Write to{" "}
              <a className="underline underline-offset-4" href={`mailto:${email}`}>
                {email}
              </a>
              .
            </>
          ) : null}
        </p>
      </div>

      <div className="mt-12 max-w-[720px]">
        <h2 className="m-0 border-b-2 border-[#0E1C3B] pb-3 font-serif text-[28px] font-medium text-[#0E1C3B]">
          Log
        </h2>
        <p className="m-0 border-b border-[#D9D2C3] py-8 font-serif text-lg leading-[1.6] italic text-[#4A5163]">
          No corrections have been needed so far.
        </p>
      </div>
    </Container>
  );
}
