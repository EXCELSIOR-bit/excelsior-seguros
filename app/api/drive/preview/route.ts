import { NextRequest, NextResponse } from "next/server";

const WF29 = "https://n8n.grupoexcelsior.co/webhook/drive-explorer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const file_id = url.searchParams.get("file_id");
  if (!file_id) {
    return NextResponse.json({ ok: false, error: "Falta file_id" }, { status: 400 });
  }
  try {
    const r = await fetch(WF29, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "preview", file_id }),
    });
    if (!r.ok) {
      const txt = await r.text();
      return NextResponse.json({ ok: false, error: `WF-29 ${r.status}: ${txt.substring(0, 200)}` }, { status: r.status });
    }
    // Reenvía el binario tal cual con su content-type
    const buf = await r.arrayBuffer();
    const contentType = r.headers.get("content-type") || "application/octet-stream";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
