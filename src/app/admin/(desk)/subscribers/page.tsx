import { SendDigestButton } from "@/components/admin/SendDigestButton";
import { EmailJsTestControls } from "@/components/admin/EmailJsTestControls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/site";
import { mailHealth } from "@/lib/mail";
import { listOutboundMail, listSubscribers } from "@/lib/store";

export default async function SubscribersPage() {
  const [subscribers, outbox] = await Promise.all([
    listSubscribers(),
    listOutboundMail(),
  ]);
  const active = subscribers.filter((sub) => !sub.unsubscribedAt);
  const health = mailHealth();
  const operational = outbox.filter((mail) => !mail.subject.startsWith("[TEST]"));
  const sent = operational.filter((mail) => mail.status === "sent").length;
  const failed = operational.filter((mail) => mail.status === "failed").length;
  const logged = operational.filter((mail) => mail.status === "logged").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Subscribers</h1>
          <p className="text-sm text-muted-foreground">
            {active.length} {active.length === 1 ? "address" : "addresses"} on the
            list.
            Active addresses in the subscriber database form the mailing list. New signups receive a welcome note; newly published articles notify active readers separately.
          </p>
        </div>
        {process.env.RESEND_API_KEY ? <SendDigestButton /> : null}
      </div>
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Subscriber and email health">
        <div className="rounded-xl border border-border p-5"><p className="text-sm text-muted-foreground">Active subscribers</p><p className="mt-2 font-serif text-4xl">{active.length}</p><p className="text-xs text-muted-foreground">{subscribers.length - active.length} unsubscribed</p></div>
        <div className="rounded-xl border border-border p-5"><p className="text-sm text-muted-foreground">Email service</p><p className="mt-2 text-xl font-semibold">{health.provider}</p><p className="mt-2 text-xs text-muted-foreground">{health.emailJsReady ? "Welcome + article keys configured; delivery not yet verified" : "EmailJS setup is incomplete"}</p></div>
        <div className="rounded-xl border border-border p-5"><p className="text-sm text-muted-foreground">Outbox history</p><p className="mt-2 text-xl font-semibold">{sent} accepted · {failed} failed</p><p className="mt-2 text-xs text-muted-foreground">{logged} logged without sending. Accepted does not guarantee inbox delivery.</p></div>
      </section>

      <section className="rounded-xl border border-border p-5">
        <h2 className="font-serif text-xl">EmailJS configuration</h2>
        <p className="mt-2 text-sm text-muted-foreground">Connected Gmail service shown in EmailJS: <code>service_59u3x2h</code>. Server environment is checked below. Never paste private keys into the website or source code.</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Configured service ID</dt><dd className="font-medium break-all">{health.serviceId ?? "Missing"}</dd></div>
          <div><dt className="text-muted-foreground">Service match</dt><dd className="font-medium">{health.serviceId ? (health.serviceId === "service_59u3x2h" ? "Matches Gmail screenshot" : "Different from Gmail screenshot — check service") : "Not configured yet"}</dd></div>
          <div><dt className="text-muted-foreground">Welcome template</dt><dd className="font-medium break-all">{health.welcomeTemplateId ?? "Missing"}</dd></div>
          <div><dt className="text-muted-foreground">Article template</dt><dd className="font-medium break-all">{health.articleTemplateId ?? "Missing"}</dd></div>
        </dl>
        {health.missing.length ? (
          <div className="mt-4 rounded-md border border-amber-500/40 p-3 text-sm">
            <p className="font-semibold">EmailJS not ready — missing environment variables:</p>
            <ul className="mt-1 list-inside list-disc break-all">{health.missing.map((key) => <li key={key}><code>{key}</code></li>)}</ul>
          </div>
        ) : (
          <p className="mt-4 text-sm text-emerald-700">Account keys and template IDs are configured. This does not prove that EmailJS accepts or delivers messages.</p>
        )}
        <p className="mt-4 text-xs leading-6 text-muted-foreground">
          Automatic EmailJS sending is limited to 10 active addresses per publication until a background queue is installed. The backend sends one recipient per request, respects unsubscribe status, and logs failures. Welcome emails and publication emails each use their own template.
        </p>
        <EmailJsTestControls enabled={health.emailJsReady} />
        <p className="mt-3 flex flex-wrap gap-4 text-sm">
          <a href="https://dashboard.emailjs.com/admin/templates" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">Configure EmailJS templates</a>
          <a href="https://github.com/Thanuka9/Tjay-Blog/blob/master/docs/EMAILJS_SETUP.md" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">Setup instructions</a>
        </p>
      </section>

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscribers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  No subscribers yet.
                </TableCell>
              </TableRow>
            ) : (
              subscribers.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>{sub.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(sub.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {sub.unsubscribedAt ? "Unsubscribed" : "Active"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <section>
        <h2 className="font-serif text-xl">Outbox</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Welcome mail, new-article notices, and admin digests. “Accepted” means the sending service accepted the request; check the recipient inbox for delivery.
        </p>
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>To</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outbox.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    No mail yet.
                  </TableCell>
                </TableRow>
              ) : (
                outbox.slice(0, 20).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.to}</TableCell>
                    <TableCell>{row.subject}</TableCell>
                    <TableCell className="capitalize">{row.kind}</TableCell>
                    <TableCell className="text-muted-foreground" title={row.error ?? undefined}>{row.status === "sent" ? "Accepted" : row.status === "logged" ? "Not sent" : `Failed${row.error ? `: ${row.error}` : ""}`}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
