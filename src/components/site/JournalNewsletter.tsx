import { SubscribeForm } from "@/components/site/SubscribeForm";
export function JournalNewsletter() {
  return (
    <section className="journal-newsletter">
      <div>
        <h2 className="font-serif text-4xl">
          One issue a month.
          <br />
          Four articles. Free.
        </h2>
        <p className="mt-4 max-w-md text-sm leading-7">
          Each article lands in your inbox when it is published. No paywall.
          Unsubscribe anytime.
        </p>
      </div>
      <SubscribeForm />
    </section>
  );
}
