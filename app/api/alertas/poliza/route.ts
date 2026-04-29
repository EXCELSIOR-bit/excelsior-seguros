// /api/alertas/poliza — crea las alertas de vencimiento al subir una póliza emitida.
// No crea workflows nuevos; reusa WF-20 (create_alert) que ya existe.

import { NextRequest, NextResponse } from "next/server";
import { wf20 } from "../../lib/n8n";

interface Body {
  cedula: string;
  negocio_id: string;
  tipo_poliza: string;
  aseguradora: string;
  fecha_vencimiento: string;  // formato YYYY-MM-DD
  dias_alerta?: number[];      // por defecto [60, 30, 15]
}

// Resta N días a una fecha YYYY-MM-DD y devuelve YYYY-MM-DD
function restarDias(fecha: string, dias: number): string {
  const d = new Date(fecha + "T00:00:00");
  d.setDate(d.getDate() - dias);
  return d.toISOString().split("T")[0];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const { cedula, negocio_id, tipo_poliza, aseguradora, fecha_vencimiento } = body;
    if (!cedula || !negocio_id || !fecha_vencimiento) {
      return NextResponse.json({ ok: false, error: "Faltan campos: cedula, negocio_id o fecha_vencimiento" }, { status: 400 });
    }
    const dias = Array.isArray(body.dias_alerta) && body.dias_alerta.length > 0
      ? body.dias_alerta
      : [60, 30, 15];

    const hoy = new Date().toISOString().split("T")[0];
    const fechaFmt = new Date(fecha_vencimiento + "T00:00:00").toLocaleDateString("es-CO");

    const resultados: { dias: number; fecha: string; ok: boolean; saltada?: boolean }[] = [];
    for (const d of dias) {
      const fechaAlerta = restarDias(fecha_vencimiento, d);
      // Si la fecha de alerta ya pasó, saltarla (solo crear alertas futuras)
      if (fechaAlerta < hoy) {
        resultados.push({ dias: d, fecha: fechaAlerta, ok: false, saltada: true });
        continue;
      }
      const desc = `Vencimiento próximo (${d} días): Póliza ${tipo_poliza} - ${aseguradora} vence el ${fechaFmt}`;
      try {
        await wf20("create_alert", {
          cedula,
          negocio_id,
          descripcion: desc,
          fecha: fechaAlerta,
          tipo: "vencimiento_poliza",
        });
        resultados.push({ dias: d, fecha: fechaAlerta, ok: true });
      } catch {
        resultados.push({ dias: d, fecha: fechaAlerta, ok: false });
      }
    }

    const creadas = resultados.filter(r => r.ok).length;
    const saltadas = resultados.filter(r => r.saltada).length;
    return NextResponse.json({
      ok: true,
      creadas,
      saltadas,
      total: dias.length,
      fecha_vencimiento,
      detalle: resultados,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
