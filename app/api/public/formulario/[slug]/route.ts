// /api/public/formulario/[slug] — endpoint PÚBLICO que carga un formulario por slug.
// También registra una visita para estadísticas.

import { NextRequest, NextResponse } from "next/server";
import { sbSelect, sbInsert } from "../../../lib/supabase";
import crypto from "crypto";

interface Ctx { params: Promise<{ slug: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { slug } = await params;
    const rows = await sbSelect<{ id: string; nombre_ramo: string; icono: string; slug: string; descripcion?: string; activo: boolean; preguntas: unknown[]; secciones: unknown[] }>(
      "Formularios",
      `select=id,nombre_ramo,icono,slug,descripcion,activo,preguntas,secciones&slug=eq.${slug}&activo=eq.true`
    );
    if (rows.length === 0) return NextResponse.json({ ok: false, error: "Formulario no disponible" }, { status: 404 });

    // Registrar visita (no bloqueante, ignorar errores)
    const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "";
    const ipHash = ip ? crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16) : "";
    const ua = req.headers.get("user-agent") || "";
    sbInsert("Visitas", { slug, ip_hash: ipHash, user_agent: ua.substring(0, 200) }, false).catch(() => {});

    return NextResponse.json({ ok: true, formulario: rows[0] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
