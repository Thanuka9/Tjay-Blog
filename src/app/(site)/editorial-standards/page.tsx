import { Container, Kicker } from "@/components/site/layout";
export const metadata = { title: "Editorial standards" };
export default function EditorialStandardsPage() {
  return (
    <Container className="py-14">
      <Kicker>The publication</Kicker>
      <h1 className="mt-4 font-serif text-5xl">Editorial standards</h1>
      <div className="journal-policy">
        <h2>Follow the sources</h2>
        <p>
          Articles link to the research they discuss and include references so
          readers can check the evidence. We distinguish laboratory and animal
          work from human studies, and early findings from established results.
        </p>
        <h2>Describe uncertainty</h2>
        <p>
          We describe study limitations, relevant conflicts of interest, and the
          difference between a measured outcome and a marketing claim.
          Regulatory status is reported with its source and publication context.
        </p>
        <h2>Keep articles and downloads aligned</h2>
        <p>
          Online articles and generated PDFs use the same content. Editor
          corrections are reflected in subsequent downloads. Articles explain
          research for a general audience and do not provide personal medical
          advice.
        </p>
        <h2>Correct the record</h2>
        <p>
          When an error is identified, the editor reviews the sources, corrects
          the article, and records material changes in the article text. Use the
          Corrections page to report an error.
        </p>
      </div>
    </Container>
  );
}
