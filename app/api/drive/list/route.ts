import { NextRequest, NextResponse } from "next/server";

const WF29 = "https://n8n.grupoexcelsior.co/webhook/drive-explorer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const folder_id = url.searchParams.get("folder_id");
  const page_token = url.searchParams.get("page_token") || "";
  const page_size = Number(url.searchParams.get("page_size") || 100);
  if (!folder_id) {
    return NextResponse.json({ ok: false, error: "Falta folder_id" }, { status: 400 });
  }
  try {
    const r = await fetch(WF29, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", folder_id, page_token, page_size }),
    });
    const data = await r.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
