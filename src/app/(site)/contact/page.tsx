import type { Metadata } from "next";
import { Container, Kicker } from "@/components/site/layout";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Contact", description: "Questions, corrections, or a claim you'd like us to look into? Get in touch." };
const contacts = [
  { title: "Suggest a topic", description: "Seen a health or science claim going viral? Send us the post or link and we'll consider it for a future issue.", email: "hello.theabyss@gmail.com" },
  { title: "Corrections", description: "Found an error? Tell us what's wrong and where. We fix it in place, add a dated note to the article and log it on our Corrections page.", email: site.correctionsEmail },
  { title: "Everything else", description: "Collaborations and general questions.", email: "hello.theabyss@gmail.com" },
];
export default function ContactPage() {
  return <Container className="publication-page contact-page">
    <Kicker>The Abyss</Kicker>
    <h1>Contact</h1>
    <p className="publication-deck">Questions, corrections, or a claim you&apos;d like us to look into? Get in touch.</p>
    <div className="contact-sections">
      {contacts.map((contact) => <section key={contact.title}>
        <h2>{contact.title}</h2>
        <div><p>{contact.description}</p><a href={`mailto:${contact.email}`}>{contact.email}</a></div>
      </section>)}
    </div>
    <p className="contact-note">We can&apos;t give personal medical advice or comment on individual treatments. For anything about your own health, please speak to a qualified professional.</p>
  </Container>;
}
