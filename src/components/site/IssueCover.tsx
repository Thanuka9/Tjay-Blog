import type { JournalIssue } from "@/lib/issues";
import { CoverMedia } from "@/components/site/CoverMedia";
export function IssueCover({ issue }: { issue: JournalIssue }) {
  return (
    <div className="issue-cover">
      <p className="cover-date">
        Volume {issue.volume}, Number {issue.number}, {issue.label}
      </p>
      <p className="cover-name">
        <i>The</i> Abyss
      </p>
      <p className="cover-subtitle">A science journal for everyone</p>
      <div className="cover-art">
        {issue.coverImage ? (
          <CoverMedia
            src={issue.coverImage}
            alt={issue.coverDescription || `${issue.label} cover`}
            sizes="320px"
            className="object-cover"
          />
        ) : (
          <svg
            viewBox="0 0 310 130"
            preserveAspectRatio="none"
            className="h-full w-full"
            aria-hidden="true"
          >
            <rect width="310" height="130" fill="#08152E" />
            <rect width="68" height="130" fill="#0D1E3F" />
            {[18, 32, 46, 60, 74].map((y) => (
              <path
                key={y}
                d={`M68 ${y} C120 ${y - 9},145 ${y + 16},196 ${y + 5} S270 ${y - 8},310 ${y + 6}`}
                fill="none"
                stroke="#2C797C"
                strokeOpacity=".35"
              />
            ))}
            {[1, 0.78, 0.56, 0.34].map((scale) => (
              <ellipse
                key={scale}
                cx="245"
                cy="101"
                rx={55 * scale}
                ry={18 * scale}
                stroke="#7FC4C9"
                strokeOpacity={0.35}
                fill="none"
              />
            ))}
            <circle cx="245" cy="101" r="1.5" fill="#7FC4C9" />
          </svg>
        )}
      </div>
      <div className="cover-contents">
        <span className="cover-number">
          {String(issue.number).padStart(2, "0")}
        </span>
        <div>
          {issue.posts.map((post) => (
            <p key={post.id}>{post.title}</p>
          ))}
        </div>
      </div>
      <p className="cover-footer">Sourced to research. Free to read.</p>
    </div>
  );
}
