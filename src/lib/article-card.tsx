import type { ReactElement } from "react";
import { site } from "@/lib/site";

/** The size social networks expect for a link preview. */
export const ARTICLE_CARD_SIZE = { width: 1200, height: 630 };

const NAVY = "#0E1C3B";
const TEAL = "#1C6670";
const CREAM = "#F5F1E8";
const GREY = "#4A5163";

export type ArticleCardContent = {
  title: string;
  kicker?: string;
  code?: string;
};

/**
 * The link-preview card for one article: kicker, title and article number in the
 * journal's own type and colours. With no article it shows the journal's tagline.
 */
export function articleCard(content: ArticleCardContent | null): ReactElement {
  const title = content?.title || site.tagline;
  const titleSize = title.length <= 48 ? 78 : title.length <= 80 ? 64 : 52;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: CREAM,
        color: NAVY,
        padding: "64px 72px",
        fontFamily: "IBM Plex Sans",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", fontSize: 20, fontWeight: 600, letterSpacing: 3, color: TEAL }}>
          A SCIENCE JOURNAL FOR EVERYONE
        </div>
        <div style={{ display: "flex", fontFamily: "Newsreader", fontSize: 40, fontWeight: 500 }}>
          <div style={{ display: "flex", fontStyle: "italic", fontWeight: 400, marginRight: 10 }}>The</div>
          <div style={{ display: "flex" }}>Abyss</div>
        </div>
      </div>
      <div style={{ display: "flex", height: 6, background: NAVY, marginTop: 28 }} />
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
        {content?.kicker ? (
          <div style={{ display: "flex", fontSize: 24, fontWeight: 600, letterSpacing: 4, color: TEAL }}>
            {content.kicker.toUpperCase()}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            fontFamily: "Newsreader",
            fontWeight: 500,
            fontSize: titleSize,
            lineHeight: 1.1,
            marginTop: content?.kicker ? 22 : 0,
          }}
        >
          {title}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: "1px solid #D9D2C3",
          paddingTop: 22,
          fontSize: 22,
          color: GREY,
        }}
      >
        <div style={{ display: "flex" }}>theabyssos.com</div>
        <div style={{ display: "flex" }}>{content?.code || ""}</div>
      </div>
    </div>
  );
}
