// /api/formularios/[id] — obtener, actualizar, borrar formulario específico

import { NextRequest, NextResponse } from "next/server";
import { sbSelect, sbUpdate, sbDelete } from "../../lib/supabase";

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const rows = await sbSelect<{ id: string }>("Formularios", `select=*&id=eq.${id}`);
    if (rows.length === 0) return NextResponse.json({ ok: false, error: "no encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, formulario: rows[0] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.nombre_ramo !== undefined) upd.nombre_ramo = body.nombre_ramo;
    if (body.icono !== undefined) upd.icono = body.icono;
    if (body.descripcion !== undefined) upd.descripcion = body.descripcion;
    if (body.activo !== undefined) upd.activo = body.activo;
    if (body.preguntas !== undefined) upd.preguntas = body.preguntas;
    if (body.secciones !== undefined) upd.secciones = body.secciones;
    if (body.orden !== undefined) upd.orden = body.orden;
    // slug NO se puede cambiar después de creado (rompería los links activos)
    const updated = await sbUpdate("Formularios", `id=eq.${id}`, upd);
    return NextResponse.json({ ok: true, formulario: updated });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    await sbDelete("Formularios", `id=eq.${id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
