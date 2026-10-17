import Link from "next/link";
import { deleteCommentAction, setCommentStatusAction } from "@/app/admin/comment-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminCommentStats, listAdminComments } from "@/lib/admin-comments";
import { formatDate } from "@/lib/site";

export default async function CommentsPage() {
  const [comments, stats] = await Promise.all([
    listAdminComments(200),
    getAdminCommentStats(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Comments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Moderate the shared discussion stored in Neon. Hidden comments disappear from the public article without being deleted.
          </p>
        </div>
        <Badge variant="outline">Neon PostgreSQL</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total" value={stats.total} />
        <Stat label="Published" value={stats.published} />
        <Stat label="Hidden" value={stats.hidden} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reader</TableHead>
              <TableHead className="min-w-[320px]">Comment</TableHead>
              <TableHead>Article</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No comments yet.
                </TableCell>
              </TableRow>
            ) : (
              comments.map((comment) => (
                <TableRow key={comment.id} className="align-top">
                  <TableCell className="font-medium">{comment.name}</TableCell>
                  <TableCell>
                    <p className="max-w-xl whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {comment.body}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/articles/${comment.articleSlug}#comments`}
                      className="block max-w-52 text-sm hover:text-brand hover:underline"
                    >
                      {comment.articleTitle}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={comment.status === "published" ? "default" : "secondary"}>
                      {comment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(comment.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <form action={setCommentStatusAction}>
                        <input type="hidden" name="id" value={comment.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={comment.status === "published" ? "hidden" : "published"}
                        />
                        <Button type="submit" size="sm" variant="outline">
                          {comment.status === "published" ? "Hide" : "Publish"}
                        </Button>
                      </form>
                      <form action={deleteCommentAction}>
                        <input type="hidden" name="id" value={comment.id} />
                        <Button type="submit" size="sm" variant="destructive">
                          Delete
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
    </div>
  );
}
