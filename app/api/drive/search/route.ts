import { NextRequest, NextResponse } from "next/server";

const WF29 = "https://n8n.grupoexcelsior.co/webhook/drive-explorer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const query = url.searchParams.get("q") || "";
  if (!query.trim() || query.trim().length < 2) {
    return NextResponse.json({ ok: true, items: [], count: 0 });
  }
  try {
    const r = await fetch(WF29, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "search", query: query.trim() }),
    });
    const data = await r.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
