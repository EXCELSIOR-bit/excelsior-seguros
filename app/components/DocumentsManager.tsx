"use client";
import { useState, useRef } from "react";
import { CloudUpload, FileText, X, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

// ====== CONFIGURACION - URL de tu n8n ======
const N8N_UPLOAD_URL = "https://n8n.grupoexcelsior.co/webhook/upload-documento";
// ============================================

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface UploadResult {
  success: boolean;
  message: string;
  is_caratula?: boolean;
  tipo_poliza?: string;
}

export default function DocumentsManager() {
  const [files, setFiles] = useState<File[]>([]);
  const [cedula, setCedula] = useState("");
  const [subfolder, setSubfolder] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    setResult(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!cedula || files.length === 0) return;
    setUploading(true);
    setResult(null);
    setUploadProgress(0);

    try {
      // Convertir todos los archivos a base64
      setUploadProgress(10);
      const fileData = await Promise.all(
        files.map(async (f, i) => {
          const base64 = await fileToBase64(f);
          setUploadProgress(10 + Math.round(((i + 1) / files.length) * 50));
          return {
            name: f.name,
            mimeType: f.type || "application/octet-stream",
            base64,
            size: f.size,
          };
        })
      );

      setUploadProgress(70);

      // Enviar a WF-10
      const response = await fetch(N8N_UPLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula: cedula.trim(),
          subfolder: subfolder.trim(),
          files: fileData,
        }),
      });

      setUploadProgress(90);
      const data = await response.json();

      if (data.status === "success") {
        setResult({
          success: true,
          message: data.message || `${files.length} archivo(s) subido(s) exitosamente`,
          is_caratula: data.is_caratula || false,
          tipo_poliza: data.tipo_poliza || "",
        });
        // Limpiar archivos despues de subir exitosamente
        setFiles([]);
      } else {
        setResult({
          success: false,
          message: data.message || "Error subiendo archivos",
        });
      }
    } catch (err) {
      console.error("Upload error:", err);
      setResult({
        success: false,
        message: "Error de conexion con el servidor. Verifica que WF-10 este activo en n8n.",
      });
    } finally {
      setUploading(false);
      setUploadProgress(100);
    }
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-2 gap-6">
        {/* Upload Area */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
          <h3 className="text-base font-semibold mb-5">Subida Masiva de Documentos</h3>

          {/* Cedula */}
          <div className="mb-4">
            <label className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
              Cedula del prospecto/cliente *
            </label>
            <input
              value={cedula}
              onChange={(e) => { setCedula(e.target.value); setResult(null); }}
              placeholder="Ej: 10777721269"
              className="w-full px-4 py-3 rounded-xl bg-[var(--surface-light)] border border-[var(--border)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent)] transition-colors font-mono"
            />
          </div>

          {/* Subcarpeta (opcional) */}
          <div className="mb-4">
            <label className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
              Subcarpeta (opcional)
            </label>
            <input
              value={subfolder}
              onChange={(e) => setSubfolder(e.target.value)}
              placeholder="Ej: seguros carros, importante, etc."
              className="w-full px-4 py-3 rounded-xl bg-[var(--surface-light)] border border-[var(--border)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
            />
            <div className="text-[11px] text-[var(--text-muted)] mt-1">
              Si no se especifica, los archivos se suben a la raiz de la carpeta del cliente
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-[var(--accent)] bg-[var(--accent-glow)]"
                : "border-[var(--border)] bg-[var(--surface-light)] hover:border-[var(--border-light)]"
            }`}
          >
            <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
            <CloudUpload size={40} className={`mx-auto mb-3 ${isDragging ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`} />
            <div className="text-[15px] font-semibold mb-1">Arrastra archivos aqui</div>
            <div className="text-[13px] text-[var(--text-muted)]">o haz clic para seleccionar — PDF, JPG, PNG, DOCX</div>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs text-[var(--text-muted)]">
                  {files.length} archivo{files.length > 1 ? "s" : ""} &middot; {(totalSize / 1024).toFixed(0)} KB total
                </div>
                <button
                  onClick={() => { setFiles([]); setResult(null); }}
                  className="text-xs text-[var(--red)] hover:text-red-400 transition-colors"
                >
                  Limpiar todo
                </button>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 bg-[var(--surface-light)] rounded-[10px] mb-1.5 border border-[var(--border)]">
                    <FileText size={16} className="text-[var(--accent)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{file.name}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFiles((prev) => prev.filter((_, j) => j !== i)); }}
                      className="text-[var(--red)] hover:text-red-400 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              {uploading && (
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)] mb-1">
                    <span>Subiendo archivos...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-[var(--surface-light)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Upload button */}
              {!uploading && !result && (
                <button
                  onClick={handleUpload}
                  disabled={!cedula.trim()}
                  className={`w-full py-3 rounded-xl border-none text-sm font-semibold mt-3 transition-all ${
                    !cedula.trim()
                      ? "bg-[var(--surface-light)] text-[var(--text-muted)] cursor-not-allowed"
                      : "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] text-[var(--bg)] hover:opacity-90 cursor-pointer"
                  }`}
                >
                  Subir {files.length} documento{files.length > 1 ? "s" : ""} a cedula {cedula || "..."}
                </button>
              )}

              {/* Uploading state */}
              {uploading && (
                <div className="w-full py-3 rounded-xl bg-[var(--accent-glow)] border border-[var(--accent)]/30 text-[var(--accent)] text-sm font-semibold text-center mt-3 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Subiendo {files.length} archivo{files.length > 1 ? "s" : ""}...
                </div>
              )}
            </div>
          )}

          {/* Result message */}
          {result && (
            <div className={`mt-4 px-4 py-3 rounded-xl text-sm flex items-start gap-2 ${
              result.success
                ? "bg-[var(--green-glow)] border border-green-500/30 text-[var(--green)]"
                : "bg-[var(--red-glow)] border border-red-500/30 text-[var(--red)]"
            }`}>
              {result.success ? <CheckCircle size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
              <div>
                <div className="font-medium">{result.success ? "Subida exitosa!" : "Error en la subida"}</div>
                <div className="text-xs mt-1 opacity-80">{result.message}</div>
                {result.is_caratula && result.tipo_poliza && (
                  <div className="text-xs mt-1 opacity-80">
                    Caratula detectada: {result.tipo_poliza}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="flex flex-col gap-6">
          {/* Instructions */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
            <h3 className="text-base font-semibold mb-4">Como funciona?</h3>
            <div className="flex flex-col gap-3">
              {[
                { step: "1", text: "Ingresa la cedula del cliente o prospecto" },
                { step: "2", text: "Opcionalmente indica una subcarpeta destino" },
                { step: "3", text: "Arrastra o selecciona los archivos a subir" },
                { step: "4", text: "Los archivos se suben a Google Drive automaticamente" },
                { step: "5", text: "Si subes una caratula/poliza, se analiza con IA" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--accent-glow)] flex items-center justify-center text-[11px] font-bold text-[var(--accent)] shrink-0">
                    {item.step}
                  </div>
                  <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{item.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
            <h3 className="text-base font-semibold mb-4">Consejos</h3>
            <div className="flex flex-col gap-2.5 text-[13px] text-[var(--text-secondary)]">
              <div className="flex items-start gap-2">
                <span className="text-[var(--accent)]">&#128161;</span>
                <span>Puedes subir multiples archivos a la vez (hasta 20)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[var(--accent)]">&#128194;</span>
                <span>Si la subcarpeta no existe, se crea automaticamente</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[var(--accent)]">&#128203;</span>
                <span>Archivos con nombre caratula o poliza se analizan con IA automaticamente</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[var(--accent)]">&#128172;</span>
                <span>Tambien puedes subir documentos desde el Chat AI</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
