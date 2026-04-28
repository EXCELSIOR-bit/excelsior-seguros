"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { Shield, Car, Home, Heart, Briefcase, FileText, Plane, Building2, Sparkles, CheckCircle2, MessageCircle, ArrowLeft, Upload, X, AlertCircle, Loader2, ChevronDown, Circle, Bike, Truck, Ship, Dog, Stethoscope, Smile, Wheat, GraduationCap, Hammer, Activity, Globe, Users, Building, Baby, Wrench } from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  shield: Shield, car: Car, bike: Bike, truck: Truck, ship: Ship, plane: Plane,
  home: Home, building: Building2, building2: Building, briefcase: Briefcase,
  users: Users, heart: Heart, stethoscope: Stethoscope, smile: Smile, activity: Activity,
  baby: Baby, dog: Dog, wheat: Wheat, hammer: Hammer, wrench: Wrench,
  graduation: GraduationCap, globe: Globe, file: FileText, sparkles: Sparkles,
};

interface Pregunta {
  id: string;
  texto: string;
  tipo: "text" | "textarea" | "number" | "email" | "tel" | "date" | "select" | "radio" | "checkbox" | "file" | "multiple_files";
  obligatorio: boolean;
  opciones?: string[];
  placeholder?: string;
  ayuda?: string;
}

interface Seccion {
  id: string;
  titulo: string;
  preguntas: Pregunta[];
}

interface Formulario {
  id: string;
  nombre_ramo: string;
  icono: string;
  slug: string;
  descripcion?: string;
  // Nuevo formato
  secciones?: Seccion[];
  // Compatibilidad: si vienen preguntas planas
  preguntas?: Pregunta[];
}

interface ArchivoSubido {
  nombre: string;
  mimeType: string;
  base64: string;
  tamañoKB: number;
}

const MAX_FILE_MB = 10;

function fileToBase64(file: File): Promise<ArchivoSubido> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || "";
      resolve({ nombre: file.name, mimeType: file.type || "application/octet-stream", base64, tamañoKB: Math.round(file.size / 1024) });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Normalizar formulario al formato de secciones
function getSecciones(f: Formulario): Seccion[] {
  if (Array.isArray(f.secciones) && f.secciones.length > 0) return f.secciones;
  if (Array.isArray(f.preguntas) && f.preguntas.length > 0) {
    return [{ id: "default", titulo: "Información", preguntas: f.preguntas }];
  }
  return [];
}

export default function FormularioPublico({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [respuestas, setRespuestas] = useState<Record<string, unknown>>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  // Sección actualmente expandida (solo una a la vez)
  const [openSec, setOpenSec] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/public/formulario/${slug}`);
        const d = await r.json();
        if (d.ok && d.formulario) {
          setFormulario(d.formulario);
          // Abrir la primera sección por defecto
          const secs = getSecciones(d.formulario);
          if (secs.length > 0) setOpenSec(secs[0].id);
        } else {
          setNotFound(true);
        }
      } catch { setNotFound(true); }
      finally { setLoading(false); }
    })();
  }, [slug]);

  const updateResp = (qid: string, valor: unknown) => {
    setRespuestas(prev => ({ ...prev, [qid]: valor }));
  };

  const handleFileChange = async (qid: string, files: FileList | null, multiple: boolean) => {
    if (!files || files.length === 0) return;
    setError("");
    const arr: ArchivoSubido[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setError(`El archivo "${file.name}" supera el límite de ${MAX_FILE_MB}MB`);
        return;
      }
      try {
        const f = await fileToBase64(file);
        arr.push(f);
      } catch {
        setError(`Error procesando "${file.name}"`);
        return;
      }
    }
    if (multiple) {
      const existing = (respuestas[qid] as ArchivoSubido[]) || [];
      updateResp(qid, [...existing, ...arr]);
    } else {
      updateResp(qid, arr[0]);
    }
  };

  const removeFile = (qid: string, multiple: boolean, idx?: number) => {
    if (multiple && typeof idx === "number") {
      const arr = (respuestas[qid] as ArchivoSubido[]) || [];
      updateResp(qid, arr.filter((_, i) => i !== idx));
    } else {
      updateResp(qid, undefined);
    }
  };

  // Verifica si una sección está completa (todos sus campos obligatorios respondidos)
  const seccionCompleta = (sec: Seccion): boolean => {
    for (const p of sec.preguntas) {
      if (!p.obligatorio) continue;
      const v = respuestas[p.id];
      const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
      if (empty) return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!formulario) return;
    setError("");
    const secs = getSecciones(formulario);
    // Validar obligatorios e identificar primera sección incompleta
    for (const sec of secs) {
      for (const p of sec.preguntas) {
        if (!p.obligatorio) continue;
        const v = respuestas[p.id];
        const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
        if (empty) {
          setError(`Falta responder en "${sec.titulo}": ${p.texto}`);
          setOpenSec(sec.id); // Abrir la sección donde está el campo faltante
          return;
        }
      }
    }
    setEnviando(true);
    try {
      // Enviar como respuestas planas (el backend ya las acepta así)
      const r = await fetch("/api/public/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, respuestas }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        setError(d.error || "Error al enviar el formulario");
        setEnviando(false);
        return;
      }
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    } finally { setEnviando(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (notFound || !formulario) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
        <div className="text-center max-w-md bg-white border border-gray-200 rounded-2xl p-8">
          <AlertCircle size={48} className="mx-auto text-orange-500 mb-3" />
          <h1 className="text-[18px] font-bold text-gray-900 mb-2">Formulario no disponible</h1>
          <p className="text-[13px] text-gray-600 mb-5">Este enlace no existe o ya no está activo. Contáctanos directamente y te ayudamos.</p>
          <a href="https://wa.me/573150733399" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-xl text-[13px] font-semibold hover:bg-green-600">
            <MessageCircle size={16} />
            Contactar por WhatsApp
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <header className="bg-white border-b border-gray-200 py-5 px-6">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <Image src="/logo3.png" alt="Excelsior" width={48} height={48} className="rounded-xl" />
            <h1 className="text-[15px] font-bold text-gray-900">EXCELSIOR AGENCIA DE SEGUROS</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center max-w-md w-full">
            <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 size={48} className="text-green-600" />
            </div>
            <h2 className="text-[22px] font-bold text-gray-900 mb-2">¡Solicitud Enviada!</h2>
            <p className="text-[14px] text-gray-600 mb-1">Gracias por enviarnos tu información</p>
            <p className="text-[13px] text-gray-500 mb-6">Hemos recibido tu solicitud correctamente. Nos pondremos en contacto contigo a la brevedad para brindarte toda la información necesaria.</p>
            <a
              href="https://wa.me/573150733399"
              target="_blank"
              rel="noreferrer"
              className="block w-full mb-2 px-5 py-3 bg-green-500 text-white rounded-xl text-[14px] font-semibold hover:bg-green-600 flex items-center justify-center gap-2"
            >
              <MessageCircle size={16} />
              Pregúntame
            </a>
            <Link href="/cotizar" className="block w-full px-5 py-3 border border-gray-300 text-gray-700 rounded-xl text-[14px] font-semibold hover:bg-gray-50">
              Volver al Inicio
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const Icon = ICON_MAP[formulario.icono] || Shield;
  const secciones = getSecciones(formulario);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-gray-200 py-5 px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Image src="/logo3.png" alt="Excelsior" width={48} height={48} className="rounded-xl" />
          <h1 className="text-[15px] font-bold text-gray-900 truncate">EXCELSIOR AGENCIA DE SEGUROS</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/cotizar" className="inline-flex items-center gap-1 text-[13px] text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft size={14} />
          Volver
        </Link>

        {/* Header del formulario */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Icon size={22} className="text-blue-600" />
          </div>
          <h2 className="text-[22px] font-bold text-gray-900">{formulario.nombre_ramo}</h2>
        </div>
        {formulario.descripcion && (
          <p className="text-[14px] text-gray-600 mb-2">{formulario.descripcion}</p>
        )}
        <p className="text-[12px] text-gray-500 mb-6">
          Los campos marcados con <span className="text-red-500">*</span> son obligatorios.
        </p>

        {/* Acordeón de secciones */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-200">
          {secciones.map(sec => {
            const isOpen = openSec === sec.id;
            const completa = seccionCompleta(sec);
            return (
              <div key={sec.id}>
                {/* Cabecera de sección */}
                <button
                  type="button"
                  onClick={() => setOpenSec(isOpen ? "" : sec.id)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    {completa ? (
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={14} className="text-white" />
                      </div>
                    ) : (
                      <Circle size={20} className="text-gray-300 shrink-0" />
                    )}
                    <span className="text-[15px] font-semibold text-gray-900">{sec.titulo}</span>
                  </div>
                  <ChevronDown size={18} className={`text-gray-500 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Cuerpo de sección */}
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 space-y-5 bg-gray-50/50">
                    {sec.preguntas.length === 0 && (
                      <p className="text-[13px] text-gray-400 italic text-center py-3">Sin preguntas en esta sección</p>
                    )}
                    {sec.preguntas.map(p => (
                      <PreguntaInput
                        key={p.id}
                        pregunta={p}
                        valor={respuestas[p.id]}
                        onChange={v => updateResp(p.id, v)}
                        onFileChange={files => handleFileChange(p.id, files, p.tipo === "multiple_files")}
                        onRemoveFile={(i) => removeFile(p.id, p.tipo === "multiple_files", i)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer con submit */}
        <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-5">
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-[13px] text-red-700">{error}</p>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={enviando}
            className="w-full px-5 py-3.5 bg-blue-600 text-white rounded-xl text-[14px] font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {enviando ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : "Enviar Solicitud"}
          </button>
          <p className="text-[11px] text-gray-500 text-center mt-3 leading-relaxed">
            Al enviar aceptas que Grupo Excelsior trate tus datos personales para gestionar tu solicitud de cotización de seguros.
          </p>
        </div>
      </main>

      <footer className="text-center py-6 text-[11px] text-gray-400">
        © {new Date().getFullYear()} Grupo Excelsior
      </footer>
    </div>
  );
}

function PreguntaInput({ pregunta, valor, onChange, onFileChange, onRemoveFile }: {
  pregunta: Pregunta;
  valor: unknown;
  onChange: (v: unknown) => void;
  onFileChange: (files: FileList | null) => void;
  onRemoveFile: (idx?: number) => void;
}) {
  const baseInput = "w-full bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition";
  const label = (
    <label className="block text-[13px] font-medium text-gray-900 mb-2">
      {pregunta.texto}
      {pregunta.obligatorio && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
  // Texto de ayuda debajo del input (si existe)
  const helpText = pregunta.ayuda ? (
    <p className="text-[12px] text-gray-500 mt-1.5">{pregunta.ayuda}</p>
  ) : null;

  if (pregunta.tipo === "textarea") {
    return (
      <div>
        {label}
        <textarea
          rows={3}
          className={baseInput + " resize-none"}
          placeholder={pregunta.placeholder || "Escribe aquí..."}
          value={(valor as string) || ""}
          onChange={e => onChange(e.target.value)}
        />
        {helpText}
      </div>
    );
  }

  if (pregunta.tipo === "select") {
    return (
      <div>
        {label}
        <select
          className={baseInput}
          value={(valor as string) || ""}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Selecciona una opción</option>
          {(pregunta.opciones || []).map(op => <option key={op} value={op}>{op}</option>)}
        </select>
        {helpText}
      </div>
    );
  }

  if (pregunta.tipo === "radio") {
    return (
      <div>
        {label}
        <div className="flex flex-wrap gap-2">
          {(pregunta.opciones || []).map(op => {
            const sel = valor === op;
            return (
              <button
                type="button"
                key={op}
                onClick={() => onChange(op)}
                className={`px-4 py-2.5 rounded-xl text-[13px] font-medium border-2 transition ${sel ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"}`}
              >
                {op}
              </button>
            );
          })}
        </div>
        {helpText}
      </div>
    );
  }

  if (pregunta.tipo === "checkbox") {
    const arr = (valor as string[]) || [];
    return (
      <div>
        {label}
        <div className="space-y-2">
          {(pregunta.opciones || []).map(op => {
            const checked = arr.includes(op);
            return (
              <label key={op} className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-300 rounded-xl cursor-pointer hover:border-gray-400">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => {
                    if (e.target.checked) onChange([...arr, op]);
                    else onChange(arr.filter(x => x !== op));
                  }}
                  className="w-4 h-4"
                />
                <span className="text-[14px] text-gray-700">{op}</span>
              </label>
            );
          })}
        </div>
        {helpText}
      </div>
    );
  }

  if (pregunta.tipo === "file" || pregunta.tipo === "multiple_files") {
    const multiple = pregunta.tipo === "multiple_files";
    const archivos: ArchivoSubido[] = multiple
      ? ((valor as ArchivoSubido[]) || [])
      : (valor ? [valor as ArchivoSubido] : []);

    return (
      <div>
        {label}
        <label className="block w-full p-5 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
          <input
            type="file"
            multiple={multiple}
            className="hidden"
            onChange={e => onFileChange(e.target.files)}
          />
          <Upload size={24} className="mx-auto text-gray-400 mb-2" />
          <p className="text-[13px] font-medium text-gray-700">
            {multiple ? "Sube uno o varios archivos" : "Sube un archivo"}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">Máx {MAX_FILE_MB}MB por archivo · PDF, JPG, PNG, etc.</p>
        </label>
        {archivos.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {archivos.map((f, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg">
                <FileText size={14} className="text-blue-600 shrink-0" />
                <span className="text-[12px] text-gray-700 truncate flex-1">{f.nombre}</span>
                <span className="text-[10px] text-gray-400">{f.tamañoKB}KB</span>
                <button
                  type="button"
                  onClick={() => onRemoveFile(multiple ? i : undefined)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {helpText}
      </div>
    );
  }

  // Tipo TEL: prefijo +57 fijo (Colombia)
  if (pregunta.tipo === "tel") {
    return (
      <div>
        {label}
        <div className="flex">
          <span className="inline-flex items-center px-3 py-3 bg-gray-100 text-gray-600 text-[13px] font-medium border border-gray-300 rounded-l-xl border-r-0">
            CO +57
          </span>
          <input
            type="tel"
            className={baseInput.replace("rounded-xl", "rounded-r-xl rounded-l-none")}
            placeholder={pregunta.placeholder || "Número de WhatsApp"}
            value={(valor as string) || ""}
            onChange={e => onChange(e.target.value)}
          />
        </div>
        {helpText}
      </div>
    );
  }

  // text, number, email, date
  return (
    <div>
      {label}
      <input
        type={pregunta.tipo}
        className={baseInput}
        placeholder={pregunta.placeholder || ""}
        value={(valor as string) || ""}
        onChange={e => onChange(e.target.value)}
      />
      {helpText}
    </div>
  );
}
