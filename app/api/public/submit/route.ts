// /api/public/submit — endpoint PÚBLICO que recibe la submission del cliente.
// Crea el prospecto, sube archivos a Drive (vía WF-10), registra el negocio.
// Soporta tanto formato viejo (preguntas planas) como nuevo (secciones).

import { NextRequest, NextResponse } from "next/server";
import { sbSelect } from "../../lib/supabase";
import { wf20, uploadToDrive, waitMs } from "../../lib/n8n";

interface RespuestaArchivo {
  nombre: string;
  mimeType: string;
  base64: string;
}

interface PreguntaDB {
  id: string;
  texto: string;
  tipo: string;
  obligatorio: boolean;
}

interface SeccionDB {
  id: string;
  titulo: string;
  preguntas: PreguntaDB[];
}

interface FormularioDB {
  id: string;
  nombre_ramo: string;
  slug: string;
  activo: boolean;
  preguntas?: PreguntaDB[];      // formato viejo
  secciones?: SeccionDB[];        // formato nuevo
}

interface SubmitBody {
  slug: string;
  respuestas: Record<string, unknown>;
}

// Aplana las preguntas de todas las secciones (o usa el array plano viejo)
function flattenPreguntas(form: FormularioDB): { preguntas: PreguntaDB[]; preguntasPorSeccion: { titulo: string; preguntas: PreguntaDB[] }[] } {
  if (Array.isArray(form.secciones) && form.secciones.length > 0) {
    const flat: PreguntaDB[] = [];
    const ps: { titulo: string; preguntas: PreguntaDB[] }[] = [];
    for (const s of form.secciones) {
      ps.push({ titulo: s.titulo, preguntas: s.preguntas || [] });
      for (const p of s.preguntas || []) flat.push(p);
    }
    return { preguntas: flat, preguntasPorSeccion: ps };
  }
  if (Array.isArray(form.preguntas) && form.preguntas.length > 0) {
    return { preguntas: form.preguntas, preguntasPorSeccion: [{ titulo: "Información", preguntas: form.preguntas }] };
  }
  return { preguntas: [], preguntasPorSeccion: [] };
}

function extractBasics(preguntas: PreguntaDB[], respuestas: Record<string, unknown>) {
  const basics = { cedula: "", nombre: "", telefono: "", correo: "" };
  // Construir lista de candidatos para cada campo, con un "score" de qué tan bien matchea
  const candidatos = {
    cedula: [] as { score: number; valor: string }[],
    nombre: [] as { score: number; valor: string }[],
    telefono: [] as { score: number; valor: string }[],
    correo: [] as { score: number; valor: string }[],
  };

  for (const p of preguntas) {
    const t = p.texto.toLowerCase();
    const v = respuestas[p.id];
    if (typeof v !== "string" || !v.trim()) continue;
    const valor = v.trim();

    // Para cédula: excluir preguntas tipo select/radio (esos suelen ser "tipo de documento")
    // y excluir preguntas que contengan la palabra "tipo"
    if (p.tipo !== "select" && p.tipo !== "radio" && !t.includes("tipo")) {
      // Score más alto para "número de cédula", "número de documento", "nit", "cc"
      if (t.includes("número de cédula") || t.includes("numero de cedula")) candidatos.cedula.push({ score: 100, valor });
      else if (t.includes("número de documento") || t.includes("numero de documento") || t.includes("número de identificación") || t.includes("numero de identificacion")) candidatos.cedula.push({ score: 90, valor });
      else if (t.includes("nit")) candidatos.cedula.push({ score: 85, valor });
      else if (t === "cédula" || t === "cedula") candidatos.cedula.push({ score: 80, valor });
      else if (t.includes("cédula") || t.includes("cedula")) candidatos.cedula.push({ score: 70, valor });
      else if (t.includes("documento")) candidatos.cedula.push({ score: 60, valor });
    }

    // Nombre — excluir "nombre de la empresa", a menos que sea para empresas (NIT)
    // Por ahora aceptamos cualquier "nombre"
    if (t.includes("nombre completo")) candidatos.nombre.push({ score: 100, valor });
    else if (t.includes("razón social") || t.includes("razon social")) candidatos.nombre.push({ score: 90, valor });
    else if (t.includes("nombre de la empresa")) candidatos.nombre.push({ score: 85, valor });
    else if (t.includes("nombre")) candidatos.nombre.push({ score: 70, valor });

    // Teléfono
    if (t.includes("whatsapp")) candidatos.telefono.push({ score: 100, valor });
    else if (t.includes("celular") || t.includes("móvil") || t.includes("movil")) candidatos.telefono.push({ score: 90, valor });
    else if (t.includes("teléfono") || t.includes("telefono")) candidatos.telefono.push({ score: 80, valor });

    // Correo
    if (t.includes("correo") || t.includes("email") || t.includes("e-mail")) candidatos.correo.push({ score: 100, valor });
  }

  // Tomar el de mayor score para cada campo
  for (const k of ["cedula", "nombre", "telefono", "correo"] as const) {
    const arr = candidatos[k];
    if (arr.length > 0) {
      arr.sort((a, b) => b.score - a.score);
      basics[k] = arr[0].valor;
    }
  }
  return basics;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SubmitBody;
    const slug = String(body.slug || "").trim();
    if (!slug) return NextResponse.json({ ok: false, error: "slug requerido" }, { status: 400 });

    const forms = await sbSelect<FormularioDB>("Formularios", `select=*&slug=eq.${slug}&activo=eq.true`);
    if (forms.length === 0) return NextResponse.json({ ok: false, error: "formulario no disponible" }, { status: 404 });
    const formulario = forms[0];

    const { preguntas, preguntasPorSeccion } = flattenPreguntas(formulario);
    const respuestas = body.respuestas || {};

    // Extraer datos básicos del cliente desde las respuestas
    const auto = extractBasics(preguntas, respuestas);
    const cedula = auto.cedula.trim();
    const nombre = auto.nombre.trim();
    const telefono = auto.telefono.trim();
    const correo = auto.correo.trim();

    if (!cedula || !nombre) {
      return NextResponse.json({ ok: false, error: "El formulario debe incluir Cédula/NIT y Nombre como preguntas obligatorias" }, { status: 400 });
    }

    // Validar obligatorios
    for (const p of preguntas) {
      if (!p.obligatorio) continue;
      const v = respuestas[p.id];
      const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
      if (empty) return NextResponse.json({ ok: false, error: `Pregunta obligatoria sin respuesta: "${p.texto}"` }, { status: 400 });
    }

    // Verificar si el cliente ya existe
    const existentes = await sbSelect<{ cedula: string; folder_id?: string; estado?: string }>(
      "Clientes", `select=cedula,folder_id,estado&cedula=eq.${cedula}`
    );
    let folderId = "";
    if (existentes.length === 0) {
      const created = await wf20("create_prospect", { cedula, nombre, telefono, correo });
      if (!created.success && !created.action) {
        return NextResponse.json({ ok: false, error: "No se pudo crear el prospecto: " + (created.error || "desconocido") }, { status: 500 });
      }
      await waitMs(2000);
      const reread = await sbSelect<{ folder_id?: string }>("Clientes", `select=folder_id&cedula=eq.${cedula}`);
      folderId = reread[0]?.folder_id || "";
    } else {
      folderId = existentes[0].folder_id || "";
    }

    // Sanitizar respuestas: omitir base64 grandes — solo guardar metadata
    const respuestasLimpias: Record<string, unknown> = {};
    const archivos: { preguntaId: string; preguntaTexto: string; nombre: string; mimeType: string; base64: string }[] = [];
    for (const p of preguntas) {
      const v = respuestas[p.id];
      if (v === undefined) continue;
      if (p.tipo === "file" && v && typeof v === "object" && "base64" in (v as object)) {
        const f = v as RespuestaArchivo;
        archivos.push({ preguntaId: p.id, preguntaTexto: p.texto, ...f });
        respuestasLimpias[p.id] = { nombre: f.nombre, tipo: "archivo" };
      } else if (p.tipo === "multiple_files" && Array.isArray(v)) {
        const arr = v as RespuestaArchivo[];
        for (const f of arr) archivos.push({ preguntaId: p.id, preguntaTexto: p.texto, ...f });
        respuestasLimpias[p.id] = arr.map(f => ({ nombre: f.nombre, tipo: "archivo" }));
      } else {
        respuestasLimpias[p.id] = v;
      }
    }

    // Crear el negocio
    const negocioCreado = await wf20("create", {
      cedula,
      tipo_poliza: formulario.nombre_ramo,
      aseguradora: "Por definir",
      etapa: "primer_contacto",
    });
    const negocioId = negocioCreado.id || "";

    // Marcar negocio con origen y respuestas (organizadas por sección)
    if (negocioId) {
      // Construir respuestas estructuradas por sección
      const respuestasEstructuradas = preguntasPorSeccion.map(sec => ({
        seccion: sec.titulo,
        preguntas: sec.preguntas.map(p => ({
          pregunta_id: p.id,
          pregunta: p.texto,
          respuesta: respuestasLimpias[p.id],
        })).filter(x => x.respuesta !== undefined),
      })).filter(s => s.preguntas.length > 0);

      try {
        await fetch(`https://uytlatezbqphqgauuvcl.supabase.co/rest/v1/Negocios?negocio_id=eq.${negocioId}`, {
          method: "PATCH",
          headers: {
            apikey: "sb_secret_oZ9AB9pNw5W8VFKWYCxUyQ_nEQtJGt3",
            Authorization: "Bearer sb_secret_oZ9AB9pNw5W8VFKWYCxUyQ_nEQtJGt3",
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            origen: "formulario",
            respuestas_formulario: {
              slug,
              ramo: formulario.nombre_ramo,
              fecha: new Date().toISOString(),
              secciones: respuestasEstructuradas,
            },
          }),
        });
      } catch { /* no bloqueante */ }
    }

    // Subir archivos a Drive
    const archivosResultado: { nombre: string; pregunta: string; ok: boolean; error?: string }[] = [];
    for (const f of archivos) {
      const r = await uploadToDrive({
        cedula,
        nombreArchivo: f.nombre,
        mimeType: f.mimeType,
        base64: f.base64,
        subfolder: "Documentos",
      });
      archivosResultado.push({ nombre: f.nombre, pregunta: f.preguntaTexto, ok: r.ok, error: r.error });
    }

    return NextResponse.json({
      ok: true,
      cedula,
      negocio_id: negocioId,
      folder_id: folderId,
      archivos_subidos: archivosResultado.filter(a => a.ok).length,
      archivos_fallidos: archivosResultado.filter(a => !a.ok),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
