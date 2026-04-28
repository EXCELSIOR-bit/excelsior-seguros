// /api/formularios — listar y crear
// GET → lista todos los formularios (para el admin)
// POST → crea un formulario nuevo

import { NextRequest, NextResponse } from "next/server";
import { sbSelect, sbInsert } from "../lib/supabase";

interface Pregunta {
  id: string;
  texto: string;
  tipo: "text" | "textarea" | "number" | "email" | "tel" | "date" | "select" | "radio" | "checkbox" | "file" | "multiple_files";
  obligatorio: boolean;
  opciones?: string[];
  placeholder?: string;
}

interface Seccion {
  id: string;
  titulo: string;
  preguntas: Pregunta[];
}

interface Formulario {
  id?: string;
  nombre_ramo: string;
  icono: string;
  slug: string;
  descripcion?: string;
  activo: boolean;
  preguntas?: Pregunta[];   // Compat con formato viejo
  secciones?: Seccion[];     // Formato nuevo
  orden: number;
}

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  try {
    const rows = await sbSelect<Formulario>("Formularios", "select=*&order=orden.asc");
    return NextResponse.json({ ok: true, formularios: rows });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nombre = String(body.nombre_ramo || "").trim();
    if (!nombre) return NextResponse.json({ ok: false, error: "nombre_ramo requerido" }, { status: 400 });

    let slug = body.slug ? slugify(String(body.slug)) : slugify(nombre);
    // Si ya existe el slug, agregar sufijo numérico
    const existing = await sbSelect<{ slug: string }>("Formularios", `select=slug&slug=like.${slug}*`);
    if (existing.length > 0) {
      const taken = new Set(existing.map(r => r.slug));
      let n = 2;
      while (taken.has(`${slug}-${n}`)) n++;
      if (taken.has(slug)) slug = `${slug}-${n}`;
    }

    const nuevo: Formulario = {
      nombre_ramo: nombre,
      icono: String(body.icono || "shield"),
      slug,
      descripcion: body.descripcion ? String(body.descripcion) : undefined,
      activo: body.activo !== false,
      // Soporta tanto secciones (nuevo) como preguntas (legacy)
      secciones: Array.isArray(body.secciones) ? body.secciones : undefined,
      preguntas: Array.isArray(body.preguntas) ? body.preguntas : (Array.isArray(body.secciones) ? [] : []),
      orden: typeof body.orden === "number" ? body.orden : 0,
    };
    const created = await sbInsert<Formulario>("Formularios", nuevo);
    return NextResponse.json({ ok: true, formulario: created });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
