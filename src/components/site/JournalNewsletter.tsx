import { Container } from "@/components/site/layout";
import { SubscribeForm } from "@/components/site/SubscribeForm";

export function JournalNewsletter() {
  return (
    <section id="newsletter" className="journal-newsletter">
      <Container className="newsletter-inner">
        <div>
          <h2>One issue a month. Two articles. Free.</h2>
          <p>Each article lands in your inbox the day it is published. No paywall. Unsubscribe anytime.</p>
        </div>
        <div className="newsletter-form"><SubscribeForm compact showLabel /></div>
      </Container>
    </section>
  );
}
