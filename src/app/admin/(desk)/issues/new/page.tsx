import { IssueEditor } from "@/components/admin/IssueEditor";
import { listPostMeta, listIssueMeta } from "@/lib/store";
import { site } from "@/lib/site";
export default async function NewIssuePage() {
  const [posts, issues] = await Promise.all([listPostMeta(), listIssueMeta()]);
  const date = new Date();
  const dateParts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    timeZone: "Asia/Colombo",
  }).formatToParts(date);
  let year = Number(dateParts.find((part) => part.type === "year")!.value),
    month = Number(dateParts.find((part) => part.type === "month")!.value);
  while (
    issues.some(
      (issue) => issue.id === `${year}-${String(month).padStart(2, "0")}`,
    )
  ) {
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  const volume =
    issues.find((issue) => issue.year === year)?.volume ??
    (issues.length ? Math.max(...issues.map((issue) => issue.volume)) + 1 : 1);
  const number =
    Math.max(
      0,
      ...issues
        .filter((issue) => issue.volume === volume)
        .map((issue) => issue.number),
    ) + 1;
  return (
    <div>
      <h1 className="mb-8 font-serif text-3xl">New journal issue</h1>
      <IssueEditor
        posts={posts}
        issue={{
          id: `${year}-${String(month).padStart(2, "0")}`,
          year,
          month,
          volume,
          number,
          editorLetter: "",
          editorName: site.name,
          coverDescription: "",
          coverImage: null,
          fullIssuePdf: null,
          status: "draft",
        }}
      />
    </div>
  );
}
