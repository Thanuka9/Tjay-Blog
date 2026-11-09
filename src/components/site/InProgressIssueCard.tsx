import type { Issue } from "@/lib/types";
import { issueLabel } from "@/lib/issues";

// Intentional non-link: draft issues are not available to public readers.
export function InProgressIssueCard({ issue }: { issue: Issue }) {
  return (
    <div className="archive-item archive-in-progress">
      <div className="in-progress-cover" aria-label={`Volume ${issue.volume}, Number ${issue.number}: in-progress issue`}>
        <p className="in-progress-cover-name"><i>The</i> Abyss</p>
        <div className="in-progress-cover-art" aria-hidden="true">
          <div className="in-progress-cover-band" />
          <div className="in-progress-cover-image" />
        </div>
        <span className="in-progress-cover-label">In-progress issue</span>
      </div>
      <h3>{issueLabel(issue)}</h3>
      <p>Vol. {issue.volume} | No. {issue.number}</p>
    </div>
  );
}
