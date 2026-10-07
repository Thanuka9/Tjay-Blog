import { ImageResponse } from "next/og";
export const alt = "The Abyss — A science journal for everyone";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#F5F0E6",
        color: "#0D1E3F",
        padding: "70px",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ fontSize: 20, letterSpacing: 5 }}>
        A SCIENCE JOURNAL FOR EVERYONE
      </div>
      <div style={{ fontSize: 130, fontFamily: "serif", marginTop: 45 }}>
        The Abyss
      </div>
      <div style={{ fontSize: 28, marginTop: 20 }}>
        Below the headlines, into the evidence.
      </div>
      <div
        style={{
          width: "100%",
          height: 5,
          background: "#0D1E3F",
          marginTop: 60,
        }}
      />
    </div>,
    size,
  );
}
