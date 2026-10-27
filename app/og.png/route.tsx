import { ImageResponse } from "next/og";

// The link preview on WhatsApp / Instagram / iMessage, rendered once at build time.
// A route named og.png (not opengraph-image) so the static export writes a real .png
// file; GitHub Pages serves extensionless files as octet-stream, which WhatsApp skips.
export const dynamic = "force-static";

const size = { width: 1200, height: 630 };

const INK = "#231f20";
const RED = "#e5191f";

// Satori can't use variable-font axes, so ask Google for a static Archivo cut at the
// wordmark's 125% width. No browser user-agent means Google serves a TTF, which Satori reads.
async function archivo(weight: number, text: string) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,${weight}&text=${encodeURIComponent(text)}`,
  ).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\) format/)?.[1];
  if (!url) throw new Error("Archivo font not found in Google Fonts response");
  return fetch(url).then((r) => r.arrayBuffer());
}

export async function GET() {
  const mark = "CHAUDHARYTRAVELS";
  const tagline = "Bus tickets across India, private bus hire and tour packages.";
  const contact = "Batla House, Okhla, New Delhi · 95999 08892";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#ffffff",
          color: INK,
          fontFamily: "Archivo",
        }}
      >
        {/* Letterhead corner, same shapes as the hero */}
        <svg
          width="520"
          height="572"
          viewBox="0 0 300 330"
          style={{ position: "absolute", right: 0, top: 0 }}
        >
          <polygon points="300,24 300,330 92,160" fill="#D1D3D4" />
          <polygon points="128,0 286,0 207,92" fill="#F8C4AD" />
        </svg>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 80px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              color: RED,
              fontWeight: 900,
              fontSize: 108,
              lineHeight: 0.86,
              letterSpacing: "-0.012em",
            }}
          >
            <span>CHAUDHARY</span>
            <span>TRAVELS</span>
          </div>
          <div style={{ height: 4, width: 760, background: INK, marginTop: 40 }} />
          <div style={{ fontSize: 34, fontWeight: 500, marginTop: 32, maxWidth: 720, lineHeight: 1.25 }}>
            {tagline}
          </div>
          <div style={{ fontSize: 26, fontWeight: 500, marginTop: 20, color: "#736e6f" }}>{contact}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo", data: await archivo(900, mark), weight: 900, style: "normal" },
        { name: "Archivo", data: await archivo(500, tagline + contact), weight: 500, style: "normal" },
      ],
    },
  );
}
