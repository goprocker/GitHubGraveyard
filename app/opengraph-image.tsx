import { ImageResponse } from "next/og";

export const alt = "GitHub Graveyard: a 3D cemetery built from public GitHub repositories";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "linear-gradient(#0d1126, #2a3158)",
      }}
    >
      <div
        style={{
          width: 620,
          height: 520,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#b9b3a0",
          borderRadius: "310px 310px 0 0",
          color: "#23263a",
        }}
      >
        <div style={{ fontSize: 76, fontFamily: "serif" }}>GitHub</div>
        <div style={{ fontSize: 76, fontFamily: "serif" }}>Graveyard</div>
        <div style={{ fontSize: 30, marginTop: 20 }}>Here lie your repositories</div>
      </div>
    </div>,
    size,
  );
}
