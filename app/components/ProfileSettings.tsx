"use client";
import { useState, useEffect } from "react";
import { X, Type, Palette, Square, RotateCcw, Check, Monitor, Minus, Plus } from "lucide-react";

interface UserPrefs {
  fontSize: number;
  accentColor: string;
  borderRadius: number;
  uiDensity: "compact" | "normal" | "spacious";
}

const DEFAULT_PREFS: UserPrefs = { fontSize: 17, accentColor: "#2563eb", borderRadius: 12, uiDensity: "normal" };

const ACCENT_PRESETS = [
  { name: "Azul Excelsior", color: "#2563eb" },
  { name: "Esmeralda", color: "#059669" },
  { name: "Violeta", color: "#7c3aed" },
  { name: "Naranja", color: "#ea580c" },
  { name: "Rosa", color: "#db2777" },
  { name: "Cian", color: "#0891b2" },
  { name: "Rojo", color: "#dc2626" },
  { name: "Ámbar", color: "#d97706" },
  { name: "Índigo", color: "#4f46e5" },
  { name: "Lima", color: "#65a30d" },
];

function hexToRgb(hex: string) {
  return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) };
}
function darken(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex); const f = 1 - amt;
  return `#${Math.round(r*f).toString(16).padStart(2,"0")}${Math.round(g*f).toString(16).padStart(2,"0")}${Math.round(b*f).toString(16).padStart(2,"0")}`;
}
function lighten(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  return `#${Math.min(255,Math.round(r+(255-r)*amt)).toString(16).padStart(2,"0")}${Math.min(255,Math.round(g+(255-g)*amt)).toString(16).padStart(2,"0")}${Math.min(255,Math.round(b+(255-b)*amt)).toString(16).padStart(2,"0")}`;
}

function applyPrefs(prefs: UserPrefs) {
  const root = document.documentElement;
  root.style.fontSize = `${prefs.fontSize}px`;
  root.style.setProperty("--accent", prefs.accentColor);
  root.style.setProperty("--accent-dark", darken(prefs.accentColor, 0.2));
  root.style.setProperty("--accent-light", lighten(prefs.accentColor, 0.15));
  const { r, g, b } = hexToRgb(prefs.accentColor);
  root.style.setProperty("--accent-glow", `rgba(${r},${g},${b},0.15)`);
  root.style.setProperty("--radius-base", `${prefs.borderRadius}px`);
  const dMap: Record<string, { btn: string; inp: string; cell: string }> = {
    compact: { btn: "6px 14px", inp: "36px", cell: "8px 12px" },
    normal: { btn: "10px 20px", inp: "44px", cell: "12px 16px" },
    spacious: { btn: "14px 24px", inp: "52px", cell: "16px 20px" },
  };
  const d = dMap[prefs.uiDensity];
  root.style.setProperty("--btn-padding", d.btn);
  root.style.setProperty("--input-height", d.inp);
  root.style.setProperty("--cell-padding", d.cell);
}

export function loadPrefs(): UserPrefs {
  try { const s = localStorage.getItem("excelsior-prefs"); if (s) return { ...DEFAULT_PREFS, ...JSON.parse(s) }; } catch {}
  return { ...DEFAULT_PREFS };
}
function savePrefs(prefs: UserPrefs) { localStorage.setItem("excelsior-prefs", JSON.stringify(prefs)); applyPrefs(prefs); }
export function initProfilePrefs() { if (typeof window !== "undefined") applyPrefs(loadPrefs()); }

interface Props { isOpen: boolean; onClose: () => void; userName?: string; userRol?: string; userAvatar?: string; }

export default function ProfileSettings({ isOpen, onClose, userName, userRol, userAvatar }: Props) {
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (isOpen) setPrefs(loadPrefs()); }, [isOpen]);

  const update = (p: Partial<UserPrefs>) => { const next = { ...prefs, ...p }; setPrefs(next); applyPrefs(next); setSaved(false); };
  const handleSave = () => { savePrefs(prefs); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const handleReset = () => { const d = { ...DEFAULT_PREFS }; setPrefs(d); applyPrefs(d); savePrefs(d); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  if (!isOpen) return null;
  const rolLabel: Record<string, string> = { admin: "Administrador", desarrollador: "Desarrollador", gestor: "Gestor" };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-[420px] h-full bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl overflow-y-auto" style={{ animation: "slideInRight 0.3s ease" }}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--surface)] border-b border-[var(--border)] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] flex items-center justify-center text-lg font-bold text-white">{userAvatar || "U"}</div>
            <div>
              <div className="font-bold text-[var(--text-primary)]">{userName || "Usuario"}</div>
              <div className="text-sm text-[var(--text-muted)]">{rolLabel[userRol || ""] || "Gestor"}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--surface-light)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><X size={20} /></button>
        </div>

        <div className="px-6 py-6 flex flex-col gap-8">
          {/* TAMAÑO DE LETRA */}
          <section>
            <div className="flex items-center gap-2 mb-4"><Type size={18} className="text-[var(--accent)]" /><h3 className="font-semibold text-[var(--text-primary)] m-0">Tamaño de letra</h3></div>
            <div className="flex items-center gap-4">
              <button onClick={() => update({ fontSize: Math.max(13, prefs.fontSize - 1) })} className="w-10 h-10 rounded-lg bg-[var(--surface-light)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"><Minus size={16} /></button>
              <div className="flex-1">
                <input type="range" min={13} max={24} step={1} value={prefs.fontSize} onChange={(e) => update({ fontSize: Number(e.target.value) })}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${((prefs.fontSize-13)/11)*100}%, var(--border) ${((prefs.fontSize-13)/11)*100}%, var(--border) 100%)`, minHeight: "8px", padding: "0" }} />
                <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)]"><span>Pequeño</span><span>Grande</span></div>
              </div>
              <button onClick={() => update({ fontSize: Math.min(24, prefs.fontSize + 1) })} className="w-10 h-10 rounded-lg bg-[var(--surface-light)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"><Plus size={16} /></button>
            </div>
            <div className="mt-3 text-center"><span className="text-2xl font-bold text-[var(--accent)]">{prefs.fontSize}px</span></div>
            <div className="mt-3 p-3 rounded-lg bg-[var(--surface-light)] border border-[var(--border)]">
              <p className="text-[var(--text-secondary)] m-0" style={{ fontSize: `${prefs.fontSize}px` }}>Vista previa del tamaño de texto</p>
            </div>
          </section>

          {/* COLOR PRINCIPAL */}
          <section>
            <div className="flex items-center gap-2 mb-4"><Palette size={18} className="text-[var(--accent)]" /><h3 className="font-semibold text-[var(--text-primary)] m-0">Color principal</h3></div>
            <div className="grid grid-cols-5 gap-3">
              {ACCENT_PRESETS.map((p) => (
                <button key={p.color} onClick={() => update({ accentColor: p.color })} className="group flex flex-col items-center gap-1.5" title={p.name}>
                  <div className="w-11 h-11 rounded-xl border-2 transition-all flex items-center justify-center"
                    style={{ backgroundColor: p.color, borderColor: prefs.accentColor === p.color ? "#fff" : "transparent", transform: prefs.accentColor === p.color ? "scale(1.1)" : "scale(1)", boxShadow: prefs.accentColor === p.color ? `0 0 16px ${p.color}60` : "none" }}>
                    {prefs.accentColor === p.color && <Check size={18} className="text-white" />}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">{p.name}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm text-[var(--text-secondary)]">Personalizado:</label>
              <input type="color" value={prefs.accentColor} onChange={(e) => update({ accentColor: e.target.value })}
                className="w-10 h-10 rounded-lg cursor-pointer border border-[var(--border)]" style={{ padding: "2px", minHeight: "40px" }} />
              <code className="text-sm text-[var(--text-muted)] bg-[var(--surface-light)] px-2 py-1 rounded">{prefs.accentColor}</code>
            </div>
          </section>

          {/* BORDES */}
          <section>
            <div className="flex items-center gap-2 mb-4"><Square size={18} className="text-[var(--accent)]" /><h3 className="font-semibold text-[var(--text-primary)] m-0">Bordes redondeados</h3></div>
            <div className="flex items-center gap-4">
              <input type="range" min={0} max={24} step={2} value={prefs.borderRadius} onChange={(e) => update({ borderRadius: Number(e.target.value) })}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${(prefs.borderRadius/24)*100}%, var(--border) ${(prefs.borderRadius/24)*100}%, var(--border) 100%)`, minHeight: "8px", padding: "0" }} />
              <span className="text-sm font-mono text-[var(--text-muted)] w-12 text-right">{prefs.borderRadius}px</span>
            </div>
            <div className="flex gap-3 mt-3">
              <div className="flex-1 h-12 bg-[var(--accent)] flex items-center justify-center text-white text-sm font-medium" style={{ borderRadius: `${prefs.borderRadius}px` }}>Botón</div>
              <div className="flex-1 h-12 bg-[var(--surface-light)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] text-sm" style={{ borderRadius: `${prefs.borderRadius}px` }}>Input</div>
              <div className="flex-1 h-12 bg-[var(--surface-light)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] text-sm" style={{ borderRadius: `${prefs.borderRadius}px` }}>Tarjeta</div>
            </div>
          </section>

          {/* DENSIDAD */}
          <section>
            <div className="flex items-center gap-2 mb-4"><Monitor size={18} className="text-[var(--accent)]" /><h3 className="font-semibold text-[var(--text-primary)] m-0">Densidad de interfaz</h3></div>
            <div className="grid grid-cols-3 gap-3">
              {(["compact","normal","spacious"] as const).map((d) => {
                const labels = { compact: "Compacto", normal: "Normal", spacious: "Espacioso" };
                const descs = { compact: "Más contenido", normal: "Balance ideal", spacious: "Más respiro" };
                const active = prefs.uiDensity === d;
                return (
                  <button key={d} onClick={() => update({ uiDensity: d })} className="p-3 rounded-xl border-2 text-center transition-all"
                    style={{ borderColor: active ? "var(--accent)" : "var(--border)", backgroundColor: active ? "var(--accent-glow)" : "var(--surface-light)" }}>
                    <div className="flex flex-col items-center gap-1 mb-2">
                      {d === "compact" && <div className="flex gap-0.5">{[1,2,3,4].map(i => <div key={i} className="w-2 h-1.5 bg-[var(--text-muted)] rounded-sm" />)}</div>}
                      {d === "normal" && <div className="flex gap-1">{[1,2,3].map(i => <div key={i} className="w-3 h-2 bg-[var(--text-muted)] rounded-sm" />)}</div>}
                      {d === "spacious" && <div className="flex gap-1.5">{[1,2].map(i => <div key={i} className="w-4 h-3 bg-[var(--text-muted)] rounded-sm" />)}</div>}
                    </div>
                    <div className="text-sm font-medium" style={{ color: active ? "var(--accent)" : "var(--text-primary)" }}>{labels[d]}</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{descs[d]}</div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[var(--surface)] border-t border-[var(--border)] px-6 py-4 flex items-center gap-3">
          <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-light)] text-sm font-medium">
            <RotateCcw size={16} /> Restaurar
          </button>
          <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm transition-all"
            style={{ backgroundColor: saved ? "var(--green)" : "var(--accent)" }}>
            {saved ? <><Check size={16} /> Guardado</> : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
