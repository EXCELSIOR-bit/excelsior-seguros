// Helper para llamar a los workflows n8n existentes desde server-side.
// NO crea workflows nuevos — solo reusa los 29 que ya están desplegados.

const N8N_BASE = "https://n8n.grupoexcelsior.co/webhook";

export async function wf20(action: string, params: Record<string, string> = {}): Promise<{ success?: boolean; error?: string; id?: string; folder_id?: string; [k: string]: unknown }> {
  const qs = new URLSearchParams({ action, ...params }).toString();
  const r = await fetch(`${N8N_BASE}/guardar-negocio?${qs}`, { method: "GET", cache: "no-store" });
  const text = await r.text();
  if (!text) return { success: false, error: "empty response" };
  try { return JSON.parse(text); } catch { return { success: false, error: "invalid json", raw: text }; }
}

// WF-10: subir documento a la carpeta del cliente en Drive.
// El workflow espera POST con {cedula, nombre_archivo, mime_type, base64, subfolder?}.
export async function uploadToDrive(args: {
  cedula: string;
  nombreArchivo: string;
  mimeType: string;
  base64: string;
  subfolder?: string;  // ej "Documentos" — si se omite, va a la raíz del cliente
}): Promise<{ ok: boolean; file_id?: string; error?: string }> {
  try {
    const r = await fetch(`${N8N_BASE}/upload-documento`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cedula: args.cedula,
        subfolder: args.subfolder || "Documentos",
        files: [{
          name: args.nombreArchivo,
          mimeType: args.mimeType,
          base64: args.base64,
        }],
      }),
    });
    const text = await r.text();
    if (!text) return { ok: false, error: "empty response" };
    try {
      const data = JSON.parse(text);
      return { ok: r.ok, file_id: data.file_id || data.id, error: data.error };
    } catch {
      return { ok: r.ok };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function waitMs(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms));
}
