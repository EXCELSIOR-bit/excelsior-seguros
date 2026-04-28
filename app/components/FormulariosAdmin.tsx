"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Copy, ExternalLink, Edit2, Trash2, X, Shield, Car, Home, Heart, Briefcase, FileText, Plane, Building2, Sparkles, Check, ChevronUp, ChevronDown, Folder, Bike, Truck, Ship, Dog, Stethoscope, Smile, Wheat, GraduationCap, Hammer, Activity, Globe, Users, Building, Baby, Wrench } from "lucide-react";

const ICON_OPTIONS = [
  { id: "shield", label: "Escudo", Icon: Shield },
  { id: "car", label: "Auto", Icon: Car },
  { id: "bike", label: "Moto / Bici", Icon: Bike },
  { id: "truck", label: "Camión", Icon: Truck },
  { id: "ship", label: "Barco", Icon: Ship },
  { id: "plane", label: "Viaje", Icon: Plane },
  { id: "home", label: "Hogar", Icon: Home },
  { id: "building", label: "Edificio", Icon: Building2 },
  { id: "building2", label: "Empresa", Icon: Building },
  { id: "briefcase", label: "Maletín", Icon: Briefcase },
  { id: "users", label: "Empleados", Icon: Users },
  { id: "heart", label: "Vida", Icon: Heart },
  { id: "stethoscope", label: "Salud", Icon: Stethoscope },
  { id: "smile", label: "Dental", Icon: Smile },
  { id: "activity", label: "Médico", Icon: Activity },
  { id: "baby", label: "Materno / Bebé", Icon: Baby },
  { id: "dog", label: "Mascota", Icon: Dog },
  { id: "wheat", label: "Agro", Icon: Wheat },
  { id: "hammer", label: "Construcción", Icon: Hammer },
  { id: "wrench", label: "Maquinaria", Icon: Wrench },
  { id: "graduation", label: "Educación", Icon: GraduationCap },
  { id: "globe", label: "Internacional", Icon: Globe },
  { id: "file", label: "Documento", Icon: FileText },
  { id: "sparkles", label: "Otro", Icon: Sparkles },
];

const TIPO_PREGUNTA_OPCIONES = [
  { id: "text", label: "Texto corto" },
  { id: "textarea", label: "Texto largo" },
  { id: "number", label: "Número" },
  { id: "email", label: "Correo" },
  { id: "tel", label: "Teléfono" },
  { id: "date", label: "Fecha" },
  { id: "select", label: "Lista desplegable" },
  { id: "radio", label: "Selección única (Sí/No)" },
  { id: "checkbox", label: "Casilla múltiple" },
  { id: "file", label: "Subir un archivo" },
  { id: "multiple_files", label: "Subir varios archivos" },
];

interface Pregunta {
  id: string;
  texto: string;
  tipo: string;
  obligatorio: boolean;
  opciones?: string[];
  placeholder?: string;
  ayuda?: string;  // Texto pequeño debajo del input (ej: "Sin espacios ni guiones")
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
  slug?: string;
  descripcion?: string;
  activo: boolean;
  secciones?: Seccion[];
  preguntas?: Pregunta[];
  orden?: number;
}

function getIconComponent(iconId: string) {
  const found = ICON_OPTIONS.find(o => o.id === iconId);
  return found ? found.Icon : Shield;
}

function genId(prefix = "id"): string {
  return prefix + "_" + Math.random().toString(36).substring(2, 9);
}

function ensureSecciones(f: Formulario): Seccion[] {
  if (Array.isArray(f.secciones) && f.secciones.length > 0) return f.secciones;
  if (Array.isArray(f.preguntas) && f.preguntas.length > 0) {
    return [{ id: genId("sec"), titulo: "Información", preguntas: f.preguntas }];
  }
  return [];
}

function totalPreguntas(f: Formulario): number {
  const secs = ensureSecciones(f);
  return secs.reduce((acc, s) => acc + s.preguntas.length, 0);
}

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

export default function FormulariosAdmin() {
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Formulario | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string>("");

  const fetchFormularios = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/formularios");
      const d = await r.json();
      if (d.ok) setFormularios(d.formularios || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFormularios(); }, [fetchFormularios]);

  const handleToggleActivo = async (f: Formulario) => {
    if (!f.id) return;
    try {
      await fetch(`/api/formularios/${f.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !f.activo }),
      });
      setFormularios(prev => prev.map(x => x.id === f.id ? { ...x, activo: !f.activo } : x));
    } catch {}
  };

  const handleDelete = async (f: Formulario) => {
    if (!f.id) return;
    if (!confirm(`¿Eliminar el formulario "${f.nombre_ramo}"? Esta acción no se puede deshacer.`)) return;
    try {
      await fetch(`/api/formularios/${f.id}`, { method: "DELETE" });
      setFormularios(prev => prev.filter(x => x.id !== f.id));
    } catch {}
  };

  const handleCopyLink = (slug: string) => {
    const url = `${BASE_URL}/cotizar/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(""), 2000);
  };

  const handleSaveModal = async (form: Formulario) => {
    try {
      const payload = {
        ...form,
        secciones: ensureSecciones(form),
        preguntas: undefined,
      };
      if (form.id) {
        await fetch(`/api/formularios/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/formularios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setEditing(null);
      await fetchFormularios();
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] text-[var(--text-muted)]">
            Crea formularios públicos para captar prospectos. Comparte el link por WhatsApp o redes sociales.
          </p>
        </div>
        <button
          onClick={() => setEditing({ nombre_ramo: "", icono: "shield", activo: true, secciones: [] })}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] text-white rounded-xl text-[14px] font-semibold hover:opacity-90 transition"
        >
          <Plus size={16} />
          Crear formulario
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-[var(--surface-light)] rounded-xl animate-pulse" />)}
        </div>
      ) : formularios.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
          <Shield size={48} className="mx-auto text-[var(--text-muted)] mb-3" />
          <p className="text-[16px] text-[var(--text)] font-medium mb-1">No hay formularios aún</p>
          <p className="text-[13px] text-[var(--text-muted)]">Crea tu primer formulario para empezar a captar prospectos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formularios.map(f => {
            const Icon = getIconComponent(f.icono);
            const url = `${BASE_URL}/cotizar/${f.slug}`;
            const total = totalPreguntas(f);
            const numSecciones = ensureSecciones(f).length;
            return (
              <div key={f.id} className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 transition ${f.activo ? "" : "opacity-60"}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${f.activo ? "bg-[var(--accent)]/10" : "bg-[var(--surface-light)]"}`}>
                    <Icon size={22} className={f.activo ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-[15px] font-semibold text-[var(--text)] truncate">{f.nombre_ramo}</h3>
                      <button
                        onClick={() => handleToggleActivo(f)}
                        title={f.activo ? "Desactivar" : "Activar"}
                        className={`shrink-0 w-10 h-5 rounded-full transition ${f.activo ? "bg-green-500" : "bg-[var(--border)]"}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transform transition ${f.activo ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                    <p className="text-[12px] text-[var(--text-muted)] mb-3">
                      {numSecciones} sección{numSecciones !== 1 ? "es" : ""} · {total} pregunta{total !== 1 ? "s" : ""}
                      {f.descripcion && ` · ${f.descripcion}`}
                    </p>

                    <div className="flex items-center gap-1 bg-[var(--surface-light)] border border-[var(--border)] rounded-lg px-3 py-2 mb-3">
                      <span className="text-[11px] text-[var(--text-muted)] font-mono truncate flex-1">{url}</span>
                      <button onClick={() => handleCopyLink(f.slug || "")} title="Copiar link" className="p-1 rounded hover:bg-[var(--surface)]">
                        {copiedSlug === f.slug ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-[var(--text-muted)]" />}
                      </button>
                      <a href={url} target="_blank" rel="noreferrer" title="Abrir en nueva pestaña" className="p-1 rounded hover:bg-[var(--surface)]">
                        <ExternalLink size={14} className="text-[var(--text-muted)]" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditing(f)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-light)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--text)] hover:border-[var(--accent)] transition"
                      >
                        <Edit2 size={12} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(f)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-[12px] text-red-500 hover:bg-red-500/20 transition"
                      >
                        <Trash2 size={12} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <FormularioModal formulario={editing} onClose={() => setEditing(null)} onSave={handleSaveModal} />}
    </div>
  );
}

function FormularioModal({ formulario, onClose, onSave }: {
  formulario: Formulario;
  onClose: () => void;
  onSave: (f: Formulario) => Promise<void>;
}) {
  const [data, setData] = useState<Formulario>({
    ...formulario,
    secciones: ensureSecciones(formulario),
  });
  const [showHelp, setShowHelp] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateSeccion = (idxSec: number, patch: Partial<Seccion>) => {
    setData(d => ({
      ...d,
      secciones: (d.secciones || []).map((s, i) => i === idxSec ? { ...s, ...patch } : s),
    }));
  };

  const addSeccion = () => {
    setData(d => ({
      ...d,
      secciones: [...(d.secciones || []), { id: genId("sec"), titulo: "Nueva sección", preguntas: [] }],
    }));
  };

  const removeSeccion = (idxSec: number) => {
    if (!confirm("¿Eliminar esta sección y todas sus preguntas?")) return;
    setData(d => ({
      ...d,
      secciones: (d.secciones || []).filter((_, i) => i !== idxSec),
    }));
  };

  const moveSeccion = (idxSec: number, dir: -1 | 1) => {
    const secs = [...(data.secciones || [])];
    const newIdx = idxSec + dir;
    if (newIdx < 0 || newIdx >= secs.length) return;
    [secs[idxSec], secs[newIdx]] = [secs[newIdx], secs[idxSec]];
    setData(d => ({ ...d, secciones: secs }));
  };

  const addPregunta = (idxSec: number) => {
    const secs = [...(data.secciones || [])];
    secs[idxSec] = {
      ...secs[idxSec],
      preguntas: [...secs[idxSec].preguntas, { id: genId("q"), texto: "", tipo: "text", obligatorio: true }],
    };
    setData(d => ({ ...d, secciones: secs }));
  };

  const updatePregunta = (idxSec: number, idxQ: number, patch: Partial<Pregunta>) => {
    const secs = [...(data.secciones || [])];
    secs[idxSec] = {
      ...secs[idxSec],
      preguntas: secs[idxSec].preguntas.map((p, i) => i === idxQ ? { ...p, ...patch } : p),
    };
    setData(d => ({ ...d, secciones: secs }));
  };

  const removePregunta = (idxSec: number, idxQ: number) => {
    const secs = [...(data.secciones || [])];
    secs[idxSec] = {
      ...secs[idxSec],
      preguntas: secs[idxSec].preguntas.filter((_, i) => i !== idxQ),
    };
    setData(d => ({ ...d, secciones: secs }));
  };

  const movePregunta = (idxSec: number, idxQ: number, dir: -1 | 1) => {
    const secs = [...(data.secciones || [])];
    const arr = [...secs[idxSec].preguntas];
    const newIdx = idxQ + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idxQ], arr[newIdx]] = [arr[newIdx], arr[idxQ]];
    secs[idxSec] = { ...secs[idxSec], preguntas: arr };
    setData(d => ({ ...d, secciones: secs }));
  };

  const handleSave = async () => {
    if (!data.nombre_ramo.trim()) { alert("El nombre del ramo es obligatorio"); return; }
    const secs = data.secciones || [];
    if (secs.length === 0) { alert("Agrega al menos una sección"); return; }
    let totalQ = 0;
    for (const s of secs) {
      if (!s.titulo.trim()) { alert("Hay secciones sin título"); return; }
      for (const p of s.preguntas) {
        if (!p.texto.trim()) { alert(`Hay preguntas vacías en "${s.titulo}". Completa o elimínalas.`); return; }
        const opcsValidas = (p.opciones || []).map(o => o.trim()).filter(Boolean);
        if ((p.tipo === "select" || p.tipo === "radio" || p.tipo === "checkbox") && opcsValidas.length === 0) {
          alert(`La pregunta "${p.texto}" requiere opciones`); return;
        }
        totalQ++;
      }
    }
    if (totalQ === 0) { alert("Agrega al menos una pregunta"); return; }
    // Limpiar opciones vacías antes de guardar (al escribir en textarea se permiten líneas vacías)
    const dataLimpia: Formulario = {
      ...data,
      secciones: (data.secciones || []).map(sec => ({
        ...sec,
        preguntas: sec.preguntas.map(p => p.opciones
          ? { ...p, opciones: p.opciones.map(o => o.trim()).filter(Boolean) }
          : p
        ),
      })),
    };
    setSaving(true);
    try { await onSave(dataLimpia); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] p-5 flex items-center justify-between z-10">
          <h2 className="text-[18px] font-bold text-[var(--text)]">
            {formulario.id ? "Editar Formulario" : "Crear Nuevo Formulario"}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--surface-light)]">
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-[var(--surface-light)] border border-[var(--border)] rounded-xl">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="w-full flex items-center justify-between p-3 text-left"
            >
              <span className="text-[13px] font-medium text-[var(--accent)]">💡 ¿Cómo funciona?</span>
              <span className="text-[var(--text-muted)] text-[18px]">{showHelp ? "−" : "+"}</span>
            </button>
            {showHelp && (
              <div className="px-3 pb-3 text-[12px] text-[var(--text-muted)] space-y-2">
                <p>Cada formulario se organiza en <strong>secciones</strong> (ej: &quot;Datos de la Empresa&quot;, &quot;Tus empleados&quot;), y cada sección contiene preguntas.</p>
                <p>Cuando un cliente lo llena:</p>
                <ul className="list-disc ml-5 space-y-0.5">
                  <li>Se crea automáticamente como Prospecto</li>
                  <li>Se le crea su carpeta en Drive</li>
                  <li>Si subió archivos, van a su subcarpeta &quot;Documentos&quot;</li>
                  <li>Aparece de inmediato en tu CRM con todas las respuestas</li>
                </ul>
                <p className="font-medium text-[var(--text)]">Importante: incluye preguntas de Cédula/NIT, Nombre, Teléfono y Correo para que el sistema pueda crear al cliente.</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[12px] uppercase font-medium text-[var(--text-muted)] mb-2">Nombre del Ramo *</label>
            <input
              type="text"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[var(--accent)]"
              placeholder="Ej: ARL - Riesgos Laborales"
              value={data.nombre_ramo}
              onChange={e => setData(d => ({ ...d, nombre_ramo: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-[12px] uppercase font-medium text-[var(--text-muted)] mb-2">Descripción (opcional)</label>
            <input
              type="text"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[var(--accent)]"
              placeholder="Ej: Completa estos datos y te ayudaré a encontrar el mejor seguro para ti."
              value={data.descripcion || ""}
              onChange={e => setData(d => ({ ...d, descripcion: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-[12px] uppercase font-medium text-[var(--text-muted)] mb-2">Ícono</label>
            <div className="grid grid-cols-8 gap-2">
              {ICON_OPTIONS.map(opt => {
                const Icon = opt.Icon;
                const sel = data.icono === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    title={opt.label}
                    onClick={() => setData(d => ({ ...d, icono: opt.id }))}
                    className={`aspect-square rounded-xl flex items-center justify-center border-2 transition ${sel ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)] hover:border-[var(--text-muted)]"}`}
                  >
                    <Icon size={18} className={sel ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[12px] uppercase font-medium text-[var(--text-muted)]">Secciones del Formulario</label>
              <span className="text-[11px] text-[var(--text-muted)]">{(data.secciones || []).length} sección{(data.secciones || []).length !== 1 ? "es" : ""}</span>
            </div>
            <div className="space-y-3">
              {(data.secciones || []).map((sec, idxSec) => (
                <SeccionEditor
                  key={sec.id}
                  seccion={sec}
                  indexSec={idxSec}
                  totalSecs={(data.secciones || []).length}
                  onChange={patch => updateSeccion(idxSec, patch)}
                  onRemove={() => removeSeccion(idxSec)}
                  onMove={dir => moveSeccion(idxSec, dir)}
                  onAddPregunta={() => addPregunta(idxSec)}
                  onUpdatePregunta={(idxQ, patch) => updatePregunta(idxSec, idxQ, patch)}
                  onRemovePregunta={idxQ => removePregunta(idxSec, idxQ)}
                  onMovePregunta={(idxQ, dir) => movePregunta(idxSec, idxQ, dir)}
                />
              ))}
              <button
                type="button"
                onClick={addSeccion}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-[var(--border)] rounded-xl text-[13px] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
              >
                <Folder size={16} />
                Agregar sección
              </button>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-[var(--surface)] border-t border-[var(--border)] p-5 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[14px] text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl text-[14px] font-semibold disabled:opacity-50"
          >
            {saving ? "Guardando..." : (formulario.id ? "Guardar cambios" : "Crear formulario")}
          </button>
        </div>
      </div>
    </div>
  );
}

function SeccionEditor({ seccion, indexSec, totalSecs, onChange, onRemove, onMove, onAddPregunta, onUpdatePregunta, onRemovePregunta, onMovePregunta }: {
  seccion: Seccion;
  indexSec: number;
  totalSecs: number;
  onChange: (patch: Partial<Seccion>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onAddPregunta: () => void;
  onUpdatePregunta: (idxQ: number, patch: Partial<Pregunta>) => void;
  onRemovePregunta: (idxQ: number) => void;
  onMovePregunta: (idxQ: number, dir: -1 | 1) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-[var(--surface-light)] border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text)]"
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        <Folder size={14} className="text-[var(--accent)] shrink-0" />
        <input
          type="text"
          value={seccion.titulo}
          onChange={e => onChange({ titulo: e.target.value })}
          placeholder="Título de la sección"
          className="flex-1 bg-transparent text-[14px] font-semibold text-[var(--text)] outline-none"
        />
        <span className="text-[11px] text-[var(--text-muted)] mr-1">
          {seccion.preguntas.length} pregunta{seccion.preguntas.length !== 1 ? "s" : ""}
        </span>
        <button type="button" onClick={() => onMove(-1)} disabled={indexSec === 0} className="p-1 text-[var(--text-muted)] disabled:opacity-30 hover:text-[var(--text)]" title="Mover arriba">
          <ChevronUp size={14} />
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={indexSec === totalSecs - 1} className="p-1 text-[var(--text-muted)] disabled:opacity-30 hover:text-[var(--text)]" title="Mover abajo">
          <ChevronDown size={14} />
        </button>
        <button type="button" onClick={onRemove} className="p-1 text-red-500 hover:bg-red-500/10 rounded" title="Eliminar sección">
          <Trash2 size={14} />
        </button>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-2">
          {seccion.preguntas.length === 0 && (
            <p className="text-[12px] text-[var(--text-muted)] italic text-center py-2">Sin preguntas en esta sección</p>
          )}
          {seccion.preguntas.map((p, idxQ) => (
            <PreguntaEditor
              key={p.id}
              pregunta={p}
              index={idxQ}
              total={seccion.preguntas.length}
              onChange={patch => onUpdatePregunta(idxQ, patch)}
              onRemove={() => onRemovePregunta(idxQ)}
              onMove={dir => onMovePregunta(idxQ, dir)}
            />
          ))}
          <button
            type="button"
            onClick={onAddPregunta}
            className="w-full flex items-center justify-center gap-2 p-2 border border-dashed border-[var(--border)] rounded-lg text-[12px] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
          >
            <Plus size={14} />
            Agregar pregunta a esta sección
          </button>
        </div>
      )}
    </div>
  );
}

function PreguntaEditor({ pregunta, index, total, onChange, onRemove, onMove }: {
  pregunta: Pregunta;
  index: number;
  total: number;
  onChange: (patch: Partial<Pregunta>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const requiereOpciones = pregunta.tipo === "select" || pregunta.tipo === "radio" || pregunta.tipo === "checkbox";
  const opcionesText = (pregunta.opciones || []).join("\n");

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] text-[var(--text-muted)] font-medium">Pregunta {index + 1}</span>
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="ml-auto p-0.5 text-[var(--text-muted)] disabled:opacity-30 hover:text-[var(--text)]">
          <ChevronUp size={12} />
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="p-0.5 text-[var(--text-muted)] disabled:opacity-30 hover:text-[var(--text)]">
          <ChevronDown size={12} />
        </button>
        <button type="button" onClick={onRemove} className="p-1 text-red-500 hover:bg-red-500/10 rounded">
          <Trash2 size={12} />
        </button>
      </div>
      <input
        type="text"
        placeholder="Ej: ¿Cuál es tu cédula?"
        value={pregunta.texto}
        onChange={e => onChange({ texto: e.target.value })}
        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
      />
      <div className="grid grid-cols-2 gap-2 mt-2">
        <select
          value={pregunta.tipo}
          onChange={e => onChange({ tipo: e.target.value, opciones: [] })}
          className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]"
        >
          {TIPO_PREGUNTA_OPCIONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-[12px] text-[var(--text)] cursor-pointer">
          <input
            type="checkbox"
            checked={pregunta.obligatorio}
            onChange={e => onChange({ obligatorio: e.target.checked })}
            className="w-4 h-4"
          />
          Obligatoria
        </label>
      </div>
      {/* Texto de ayuda opcional */}
      <input
        type="text"
        placeholder="Texto de ayuda (opcional, ej: Sin espacios ni guiones)"
        value={pregunta.ayuda || ""}
        onChange={e => onChange({ ayuda: e.target.value })}
        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-[var(--accent)] mt-2"
      />
      {requiereOpciones && (
        <div className="mt-2">
          <label className="block text-[11px] text-[var(--text-muted)] mb-1">Opciones (una por línea)</label>
          <textarea
            rows={3}
            placeholder={"Opción 1\nOpción 2\nOpción 3"}
            value={opcionesText}
            onChange={e => onChange({ opciones: e.target.value.split("\n") })}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)] resize-none"
          />
        </div>
      )}
    </div>
  );
}
