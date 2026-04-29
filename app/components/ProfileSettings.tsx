"use client";
import { useState, useEffect } from "react";
import { X, Type, Palette, Square, RotateCcw, Check, Monitor, Minus, Plus, Eye, Zap, User, Image as ImageIcon, Volume2, Trash2 } from "lucide-react";

interface UserPrefs {
  fontSize: number;
  accentColor: string;
  borderRadius: number;
  uiDensity: "compact" | "normal" | "spacious";
  themeId: string; // "default" | preset | "custom"
  customBg: string; // solo se usa si themeId === "custom"
  colorBlindMode: "none" | "deuteranopia" | "protanopia" | "tritanopia"; // accesibilidad
  animations: boolean; // false = desactiva todas las animaciones/transiciones
  avatarDataUrl: string; // base64 (data: URL) de imagen avatar, "" = inicial por defecto
  bgPattern: "none" | "grid" | "dots" | "lines" | "waves" | "mesh"; // patrón decorativo
  bgPatternOpacity: number; // 0-100
  soundAlerts: boolean; // sonido al primer login con alertas
  soundTone: "soft" | "ding" | "chime"; // qué tono usar
}

const DEFAULT_PREFS: UserPrefs = {
  fontSize: 17, accentColor: "#2563eb", borderRadius: 12, uiDensity: "normal",
  themeId: "default", customBg: "#0a0f1a",
  colorBlindMode: "none", animations: true, avatarDataUrl: "",
  bgPattern: "none", bgPatternOpacity: 30, soundAlerts: false, soundTone: "soft"
};

interface ThemePreset {
  id: string;
  name: string;
  emoji: string;
  base: string; // color base del fondo
  isDark: boolean;
}

const THEME_PRESETS: ThemePreset[] = [
  { id: "default",  name: "Azul Excelsior", emoji: "🌊", base: "#0a0f1a", isDark: true },
  { id: "carbon",   name: "Negro carbón",   emoji: "⚫", base: "#0a0a0a", isDark: true },
  { id: "graphite", name: "Gris grafito",   emoji: "🔘", base: "#18181b", isDark: true },
  { id: "purple",   name: "Púrpura nocturno", emoji: "🟣", base: "#1a0f2e", isDark: true },
  { id: "forest",   name: "Verde bosque",   emoji: "🌲", base: "#0d1f17", isDark: true },
  { id: "espresso", name: "Café espresso",  emoji: "☕", base: "#1c1410", isDark: true },
  { id: "navy",     name: "Marino profundo",emoji: "🌑", base: "#001220", isDark: true },
  { id: "light",    name: "Luz",            emoji: "☀️", base: "#ffffff", isDark: false },
  { id: "cream",    name: "Crema",          emoji: "🍶", base: "#fafaf5", isDark: false },
  { id: "fog",      name: "Niebla",         emoji: "🌫️", base: "#f0f4f8", isDark: false },
];

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

/** Detecta si un color es oscuro (luminancia < 0.5) */
function isDark(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.5;
}

/** Genera todas las variables de un tema derivadas del color base */
function buildTheme(base: string, dark: boolean) {
  if (dark) {
    return {
      "--bg": base,
      "--surface": lighten(base, 0.04),
      "--surface-light": lighten(base, 0.08),
      "--surface-hover": lighten(base, 0.12),
      "--border": lighten(base, 0.18),
      "--border-light": lighten(base, 0.28),
      "--text-primary": "#f1f5f9",
      "--text-secondary": "#94a3b8",
      "--text-muted": "#64748b",
      "--logo-filter": "brightness(0) invert(1)",
      "--shadow": "0 1px 3px rgba(0,0,0,0.3)",
      "--shadow-md": "0 2px 6px rgba(0,0,0,0.35)",
      "--shadow-lg": "0 8px 24px rgba(0,0,0,0.45)",
    };
  }
  // Light theme
  return {
    "--bg": base,
    "--surface": darken(base, 0.02),
    "--surface-light": darken(base, 0.04),
    "--surface-hover": darken(base, 0.06),
    "--border": darken(base, 0.12),
    "--border-light": darken(base, 0.18),
    "--text-primary": "#0f172a",
    "--text-secondary": "#475569",
    "--text-muted": "#64748b",
    "--logo-filter": "none",
    "--shadow": "0 1px 3px rgba(0,0,0,0.08)",
    "--shadow-md": "0 4px 12px rgba(0,0,0,0.10)",
    "--shadow-lg": "0 10px 30px rgba(0,0,0,0.15)",
  };
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

  // Aplicar tema (fondo + superficies)
  let baseColor: string;
  let dark: boolean;
  if (prefs.themeId === "custom") {
    baseColor = prefs.customBg;
    dark = isDark(baseColor);
  } else {
    const preset = THEME_PRESETS.find((t) => t.id === prefs.themeId) || THEME_PRESETS[0];
    baseColor = preset.base;
    dark = preset.isDark;
  }
  const themeVars = buildTheme(baseColor, dark);
  Object.entries(themeVars).forEach(([k, v]) => root.style.setProperty(k, v));
  // Marca el body con atributos para que CSS pueda condicionar reglas
  document.body.setAttribute("data-theme-mode", dark ? "dark" : "light");

  // Modo daltonismo: mapeo de colores de etapas/alertas a paletas accesibles
  document.body.setAttribute("data-cb-mode", prefs.colorBlindMode);
  const cbMaps: Record<string, Record<string, string>> = {
    none: {},
    deuteranopia: {
      "--green": "#0072B2", "--green-glow": "rgba(0,114,178,0.18)",
      "--red": "#D55E00", "--red-glow": "rgba(213,94,0,0.18)",
      "--stage-emitted": "#0072B2", "--stage-emitted-glow": "rgba(0,114,178,0.15)",
      "--stage-lost": "#D55E00", "--stage-lost-glow": "rgba(213,94,0,0.15)",
    },
    protanopia: {
      "--green": "#56B4E9", "--green-glow": "rgba(86,180,233,0.18)",
      "--red": "#E69F00", "--red-glow": "rgba(230,159,0,0.18)",
      "--stage-emitted": "#56B4E9", "--stage-emitted-glow": "rgba(86,180,233,0.15)",
      "--stage-lost": "#E69F00", "--stage-lost-glow": "rgba(230,159,0,0.15)",
    },
    tritanopia: {
      "--blue": "#CC79A7", "--blue-glow": "rgba(204,121,167,0.18)",
      "--cyan": "#F0E442", "--cyan-glow": "rgba(240,228,66,0.18)",
      "--stage-cold": "#CC79A7", "--stage-cold-glow": "rgba(204,121,167,0.15)",
    },
  };
  // Limpiar valores anteriores: aplicar el mapa actual sobre las variables (los demás se quedan con el default del CSS)
  const cbVars = cbMaps[prefs.colorBlindMode] || {};
  // Lista completa de variables que el modo daltonismo puede tocar (para resetear las que no estén en el mapa actual)
  const cbAllKeys = new Set<string>(Object.keys(cbMaps.deuteranopia).concat(Object.keys(cbMaps.protanopia), Object.keys(cbMaps.tritanopia)));
  cbAllKeys.forEach((k) => root.style.removeProperty(k));
  Object.entries(cbVars).forEach(([k, v]) => root.style.setProperty(k, v));

  // Animaciones on/off
  document.body.setAttribute("data-anim", prefs.animations ? "on" : "off");

  // Notificar a otros componentes (Sidebar, etc.) que las prefs cambiaron
  if (typeof window !== "undefined") {
    try { window.dispatchEvent(new Event("excelsior-prefs-updated")); } catch {}
  }

  // Patrón de fondo (SVG inline en data:URL)
  const patternColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const patterns: Record<string, string> = {
    none: "",
    grid: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><path d='M0 0h40v40H0z' fill='none' stroke='${encodeURIComponent(patternColor)}' stroke-width='1'/></svg>")`,
    dots: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='12' cy='12' r='1.4' fill='${encodeURIComponent(patternColor)}'/></svg>")`,
    lines: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><path d='M0 20h40' stroke='${encodeURIComponent(patternColor)}' stroke-width='1'/></svg>")`,
    waves: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='20'><path d='M0 10 Q 20 0 40 10 T 80 10' fill='none' stroke='${encodeURIComponent(patternColor)}' stroke-width='1'/></svg>")`,
    mesh: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><path d='M0 30 L60 30 M30 0 L30 60 M0 0 L60 60 M60 0 L0 60' stroke='${encodeURIComponent(patternColor)}' stroke-width='0.5'/></svg>")`,
  };
  const patternUrl = patterns[prefs.bgPattern] || "";
  root.style.setProperty("--bg-pattern", patternUrl);
  root.style.setProperty("--bg-pattern-opacity", String((prefs.bgPatternOpacity || 0) / 100));
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

/** Reproduce un tono corto usando Web Audio API (sin archivos). */
export function playAlertSound(tone: "soft" | "ding" | "chime" = "soft") {
  if (typeof window === "undefined") return;
  try {
    const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctx = W.AudioContext || W.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const playTone = (freq: number, start: number, duration: number, volume = 0.18) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0, ctx.currentTime + start);
      g.gain.linearRampToValueAtTime(volume, ctx.currentTime + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + duration + 0.05);
    };
    if (tone === "soft") { playTone(523.25, 0, 0.18); playTone(659.25, 0.12, 0.22); }
    else if (tone === "ding") { playTone(880, 0, 0.4, 0.22); }
    else if (tone === "chime") { playTone(523.25, 0, 0.15); playTone(659.25, 0.1, 0.15); playTone(783.99, 0.2, 0.3, 0.2); }
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {}
}

/** Reproduce el sonido si las prefs lo permiten y todavía no sonó en esta sesión. */
export function maybePlayAlertSoundOnce() {
  if (typeof window === "undefined") return;
  try {
    const prefs = loadPrefs();
    if (!prefs.soundAlerts) return;
    if (sessionStorage.getItem("excelsior-alert-sound-played") === "1") return;
    sessionStorage.setItem("excelsior-alert-sound-played", "1");
    playAlertSound(prefs.soundTone);
  } catch {}
}

export function loadPrefs(): UserPrefs {
  try { const s = localStorage.getItem("excelsior-prefs"); if (s) return { ...DEFAULT_PREFS, ...JSON.parse(s) }; } catch {}
  return { ...DEFAULT_PREFS };
}
function savePrefs(prefs: UserPrefs) { localStorage.setItem("excelsior-prefs", JSON.stringify(prefs)); applyPrefs(prefs); }
export function getUserAvatar(): string {
  try { return loadPrefs().avatarDataUrl || ""; } catch { return ""; }
}

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
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] flex items-center justify-center text-lg font-bold text-white overflow-hidden">
              {prefs.avatarDataUrl ? (<img src={prefs.avatarDataUrl} alt="avatar" className="w-full h-full object-cover" />) : (userAvatar || "U")}
            </div>
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

          {/* TEMA / FONDO */}
          <section>
            <div className="flex items-center gap-2 mb-4"><Monitor size={18} className="text-[var(--accent)]" /><h3 className="font-semibold text-[var(--text-primary)] m-0">Tema (fondo)</h3></div>
            <p className="text-[12px] text-[var(--text-muted)] mb-3 mt-0">Al elegir un tema se ajustan automáticamente fondo, tarjetas, inputs y bordes.</p>
            <div className="grid grid-cols-3 gap-2.5">
              {THEME_PRESETS.map((t) => {
                const active = prefs.themeId === t.id;
                return (
                  <button key={t.id} onClick={() => update({ themeId: t.id })}
                    className="group relative rounded-xl border-2 p-2 text-left transition-all overflow-hidden"
                    style={{ borderColor: active ? "var(--accent)" : "var(--border)" }}>
                    {/* Mini preview */}
                    <div className="rounded-md overflow-hidden mb-2" style={{ background: t.base, border: `1px solid ${t.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, height: 48 }}>
                      <div className="flex gap-1 p-1.5">
                        <div className="rounded-sm flex-1" style={{ background: t.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", height: 8 }} />
                        <div className="rounded-sm" style={{ background: prefs.accentColor, height: 8, width: 14 }} />
                      </div>
                      <div className="px-1.5 mt-1">
                        <div className="rounded-sm" style={{ background: t.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", height: 18 }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[12px]">{t.emoji}</span>
                      <span className="text-[11px] font-medium text-[var(--text-primary)] truncate">{t.name}</span>
                      {active && <Check size={12} className="text-[var(--accent)] ml-auto shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-3 p-3 rounded-xl border border-dashed border-[var(--border)]">
              <label className="text-[12px] text-[var(--text-secondary)] flex-shrink-0">Personalizado:</label>
              <input type="color" value={prefs.themeId === "custom" ? prefs.customBg : "#0a0f1a"}
                onChange={(e) => update({ themeId: "custom", customBg: e.target.value })}
                className="w-10 h-10 rounded-lg cursor-pointer border border-[var(--border)]" style={{ padding: "2px", minHeight: "40px" }} />
              <code className="text-[11px] text-[var(--text-muted)] bg-[var(--surface-light)] px-2 py-1 rounded flex-1">{prefs.themeId === "custom" ? prefs.customBg : "Elige un color"}</code>
              {prefs.themeId === "custom" && <button onClick={() => update({ themeId: "default" })} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] underline">Quitar</button>}
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

          {/* AVATAR PERSONALIZABLE */}
          <section>
            <div className="flex items-center gap-2 mb-4"><User size={18} className="text-[var(--accent)]" /><h3 className="font-semibold text-[var(--text-primary)] m-0">Foto de perfil</h3></div>
            <p className="text-[12px] text-[var(--text-muted)] mb-3 mt-0">Sube una imagen (JPG/PNG, máx 200KB). Solo se guarda en este equipo.</p>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] flex items-center justify-center text-2xl font-bold text-white overflow-hidden border-2 border-[var(--border)]">
                {prefs.avatarDataUrl ? <img src={prefs.avatarDataUrl} alt="avatar" className="w-full h-full object-cover" /> : (userAvatar || "U")}
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[var(--accent)] text-white text-[12px] font-semibold hover:opacity-90">
                  <ImageIcon size={14} /> Subir imagen
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    if (f.size > 200 * 1024) { alert("La imagen pesa más de 200KB. Comprímela antes de subir."); e.target.value = ""; return; }
                    const reader = new FileReader();
                    reader.onload = () => { update({ avatarDataUrl: String(reader.result || "") }); };
                    reader.readAsDataURL(f);
                    e.target.value = "";
                  }} />
                </label>
                {prefs.avatarDataUrl && (
                  <button onClick={() => update({ avatarDataUrl: "" })} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-glow)] text-[12px]">
                    <Trash2 size={14} /> Quitar imagen
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* DALTONISMO */}
          <section>
            <div className="flex items-center gap-2 mb-4"><Eye size={18} className="text-[var(--accent)]" /><h3 className="font-semibold text-[var(--text-primary)] m-0">Modo accesibilidad (daltonismo)</h3></div>
            <p className="text-[12px] text-[var(--text-muted)] mb-3 mt-0">Ajusta los colores de etapas y alertas para mejor distinción.</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: "none", label: "Normal", desc: "Sin ajustes" },
                { id: "deuteranopia", label: "Deuteranopia", desc: "Verde-rojo" },
                { id: "protanopia", label: "Protanopia", desc: "Rojo-verde" },
                { id: "tritanopia", label: "Tritanopia", desc: "Azul-amarillo" },
              ] as const).map((o) => {
                const active = prefs.colorBlindMode === o.id;
                return (
                  <button key={o.id} onClick={() => update({ colorBlindMode: o.id })}
                    className="p-3 rounded-xl border-2 text-left transition-all"
                    style={{ borderColor: active ? "var(--accent)" : "var(--border)", backgroundColor: active ? "var(--accent-glow)" : "var(--surface-light)" }}>
                    <div className="text-[12px] font-semibold" style={{ color: active ? "var(--accent)" : "var(--text-primary)" }}>{o.label}</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{o.desc}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ANIMACIONES */}
          <section>
            <div className="flex items-center gap-2 mb-4"><Zap size={18} className="text-[var(--accent)]" /><h3 className="font-semibold text-[var(--text-primary)] m-0">Animaciones</h3></div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-light)] border border-[var(--border)]">
              <div>
                <div className="text-[13px] font-medium text-[var(--text-primary)]">Activar animaciones y transiciones</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Desactivar puede mejorar el rendimiento en equipos lentos.</div>
              </div>
              <button onClick={() => update({ animations: !prefs.animations })}
                className="relative w-12 h-7 rounded-full transition-colors"
                style={{ backgroundColor: prefs.animations ? "var(--accent)" : "var(--border)" }}>
                <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: prefs.animations ? "translateX(20px)" : "translateX(0)" }} />
              </button>
            </div>
          </section>

          {/* PATRÓN DE FONDO */}
          <section>
            <div className="flex items-center gap-2 mb-4"><ImageIcon size={18} className="text-[var(--accent)]" /><h3 className="font-semibold text-[var(--text-primary)] m-0">Patrón de fondo</h3></div>
            <p className="text-[12px] text-[var(--text-muted)] mb-3 mt-0">Añade textura sutil al fondo del CRM.</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {([
                { id: "none", label: "Ninguno" },
                { id: "grid", label: "Cuadrícula" },
                { id: "dots", label: "Puntos" },
                { id: "lines", label: "Líneas" },
                { id: "waves", label: "Ondas" },
                { id: "mesh", label: "Malla" },
              ] as const).map((p2) => {
                const active = prefs.bgPattern === p2.id;
                return (
                  <button key={p2.id} onClick={() => update({ bgPattern: p2.id })}
                    className="aspect-[3/2] rounded-xl border-2 flex items-end justify-center pb-1.5 transition-all overflow-hidden relative"
                    style={{ borderColor: active ? "var(--accent)" : "var(--border)", backgroundColor: "var(--bg)" }}>
                    {p2.id !== "none" && (
                      <div className="absolute inset-0 opacity-50" style={{
                        backgroundImage: ({grid:`linear-gradient(var(--text-muted) 1px,transparent 1px),linear-gradient(90deg,var(--text-muted) 1px,transparent 1px)`,
                          dots:`radial-gradient(var(--text-muted) 1px,transparent 1px)`,
                          lines:`repeating-linear-gradient(0deg,var(--text-muted) 0 1px,transparent 1px 8px)`,
                          waves:`radial-gradient(circle at 50% 100%,var(--text-muted) 1px,transparent 2px)`,
                          mesh:`linear-gradient(45deg,var(--text-muted) 1px,transparent 1px),linear-gradient(-45deg,var(--text-muted) 1px,transparent 1px)`,
                        } as Record<string,string>)[p2.id],
                        backgroundSize: p2.id === "dots" || p2.id === "waves" ? "10px 10px" : "12px 12px",
                      }} />
                    )}
                    <span className="relative text-[10px] font-medium" style={{ color: active ? "var(--accent)" : "var(--text-secondary)" }}>{p2.label}</span>
                  </button>
                );
              })}
            </div>
            {prefs.bgPattern !== "none" && (
              <div>
                <label className="text-[11px] text-[var(--text-muted)]">Intensidad: {prefs.bgPatternOpacity}%</label>
                <input type="range" min={5} max={80} step={5} value={prefs.bgPatternOpacity} onChange={(e) => update({ bgPatternOpacity: Number(e.target.value) })}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer mt-1" style={{ background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${prefs.bgPatternOpacity}%, var(--border) ${prefs.bgPatternOpacity}%, var(--border) 100%)` }} />
              </div>
            )}
          </section>

          {/* SONIDO DE ALERTAS */}
          <section>
            <div className="flex items-center gap-2 mb-4"><Volume2 size={18} className="text-[var(--accent)]" /><h3 className="font-semibold text-[var(--text-primary)] m-0">Sonido de alertas</h3></div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-light)] border border-[var(--border)] mb-3">
              <div>
                <div className="text-[13px] font-medium text-[var(--text-primary)]">Reproducir tono al iniciar sesión</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Suena 1 vez por sesión si tienes alertas pendientes.</div>
              </div>
              <button onClick={() => update({ soundAlerts: !prefs.soundAlerts })}
                className="relative w-12 h-7 rounded-full transition-colors"
                style={{ backgroundColor: prefs.soundAlerts ? "var(--accent)" : "var(--border)" }}>
                <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: prefs.soundAlerts ? "translateX(20px)" : "translateX(0)" }} />
              </button>
            </div>
            {prefs.soundAlerts && (
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: "soft", label: "Suave" },
                  { id: "ding", label: "Ding" },
                  { id: "chime", label: "Carillón" },
                ] as const).map((t) => {
                  const active = prefs.soundTone === t.id;
                  return (
                    <button key={t.id} onClick={() => { update({ soundTone: t.id }); playAlertSound(t.id); }}
                      className="p-2.5 rounded-xl border-2 text-center transition-all"
                      style={{ borderColor: active ? "var(--accent)" : "var(--border)", backgroundColor: active ? "var(--accent-glow)" : "var(--surface-light)" }}>
                      <div className="text-[12px] font-semibold" style={{ color: active ? "var(--accent)" : "var(--text-primary)" }}>{t.label}</div>
                      <div className="text-[9px] text-[var(--text-muted)] mt-0.5">Click para probar</div>
                    </button>
                  );
                })}
              </div>
            )}
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
