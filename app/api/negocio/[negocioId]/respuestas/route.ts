// /api/negocio/[negocioId]/respuestas — devuelve las respuestas del formulario de un negocio.
// Solo accesible desde el CRM (no del lado del cliente público).

import { NextRequest, NextResponse } from "next/server";
import { sbSelect } from "../../../lib/supabase";

interface Ctx { params: Promise<{ negocioId: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { negocioId } = await params;
    const rows = await sbSelect<{ negocio_id: string; origen?: string; respuestas_formulario?: unknown }>(
      "Negocios",
      `select=negocio_id,origen,respuestas_formulario&negocio_id=eq.${negocioId}`
    );
    if (rows.length === 0) return NextResponse.json({ ok: false, error: "negocio no encontrado" }, { status: 404 });
    return NextResponse.json({
      ok: true,
      origen: rows[0].origen || "manual",
      respuestas_formulario: rows[0].respuestas_formulario || null,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
