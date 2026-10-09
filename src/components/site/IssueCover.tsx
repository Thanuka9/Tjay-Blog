import Image from "next/image";
import type { JournalIssue } from "@/lib/issues";
import { issueCoverImage, issueCoverDescription } from "@/lib/issue-cover";
import { CoverMedia } from "@/components/site/CoverMedia";

export function IssueCover({ issue, variant = "standard", current = false }: {
  issue: JournalIssue;
  variant?: "standard" | "archive" | "full";
  current?: boolean;
}) {
  const image = issueCoverImage(issue);
  return (
    <div className={`issue-cover issue-cover-${variant}`}>
      <div className="cover-topline">
        <div className="cover-brand">
          <Image src="/brand/abyss-logo.png" alt="" width={24} height={24} />
          <span>A science journal<br />for everyone</span>
        </div>
        <p className="cover-date">Volume {issue.volume}, Number {issue.number},<br />{issue.label}</p>
      </div>
      <p className="cover-name"><i>The</i> Abyss</p>
      <p className="cover-subtitle">Below the headlines, into the evidence.</p>
      <div className="cover-art">
        <div className="cover-color" />
        <div className="cover-photo">
          {image ? <CoverMedia src={image} alt={issueCoverDescription(issue)} priority={variant !== "archive"} sizes={variant === "full" ? "(max-width: 1200px) 80vw, 900px" : "(max-width: 767px) 80vw, 360px"} /> : <div className="cover-abstract" />}
          {image === "/covers/insulin-crystals.webp" && <span className="cover-caption">On the cover · Crystals of insulin · {variant === "full" && "Antonio Romero / Science Photo Library · "}{issue.posts[0]?.articleCode}</span>}
        </div>
      </div>
      <div className="cover-contents">
        <div className="cover-issue-number">
          <span className="cover-number">{String(issue.number).padStart(2, "0")}</span>
          <p>Vol. {issue.volume} · {issue.label}</p>
        </div>
        <div className="cover-articles">
          {issue.posts.map((post) => <div key={post.id}>
            <span className="cover-article-type">{post.articleType}</span>
            <p>{post.title} {variant === "full" && <span className="cover-article-code">{post.articleCode}</span>}</p>
          </div>)}
          {issue.upcomingArticles?.map((post) => <div key={post.articleCode}><span className="cover-article-type">{post.articleType}</span><p>{post.title}</p></div>)}
        </div>
      </div>
      <div className="cover-footer"><span>The research you need to make informed decisions</span><span>Sourced to peer-reviewed research</span></div>
      {variant === "archive" && current && <span className="archive-current-label">Current issue</span>}
    </div>
  );
}
