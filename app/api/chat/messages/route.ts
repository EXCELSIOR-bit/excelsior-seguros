import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const session_id = url.searchParams.get("session_id");

  if (!session_id) {
    return NextResponse.json({ ok: false, error: "Falta session_id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", session_id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, messages: data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { session_id, usuario_nombre, role, content } = body;

  if (!session_id || !role || !content) {
    return NextResponse.json({ ok: false, error: "Faltan campos" }, { status: 400 });
  }

  const { error } = await supabase.from("chat_messages").insert({
    session_id,
    usuario_nombre,
    role,
    content,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}