import { SendDigestButton } from "@/components/admin/SendDigestButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/site";
import { mailConfigured } from "@/lib/mail";
import { listOutboundMail, listSubscribers } from "@/lib/store";

export default async function SubscribersPage() {
  const [subscribers, outbox] = await Promise.all([
    listSubscribers(),
    listOutboundMail(),
  ]);
  const active = subscribers.filter((sub) => !sub.unsubscribedAt);
  const configured = mailConfigured();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Subscribers</h1>
          <p className="text-sm text-muted-foreground">
            {active.length} {active.length === 1 ? "address" : "addresses"} on the
            list.
            {configured
              ? " New signups and new articles send email automatically."
              : " Add RESEND_API_KEY to send real mail; until then letters are stored in the outbox."}
          </p>
        </div>
        <SendDigestButton />
      </div>
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
          Welcome mail, new-article notices, and admin digests.
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
                    <TableCell className="text-muted-foreground">{row.status}</TableCell>
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
