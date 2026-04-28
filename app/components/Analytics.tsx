"use client";
import { useState, useEffect, useMemo } from "react";
import { TrendingUp, TrendingDown, Shield, DollarSign, Users, Activity, BarChart3, PieChart, RefreshCw } from "lucide-react";
import type { Client } from "../page";

/* ═══ SPARKLINE ═══ */
function Sparkline({ data, color = "#00E5FF", w = 80, h = 28 }: { data: number[]; color?: string; w?: number; h?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1), min = Math.min(...data, 0), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs><linearGradient id={`sp-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polygon points={`${pts} ${w},${h} 0,${h}`} fill={`url(#sp-${color.slice(1)})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══ KPI CARD ═══ */
function KPI({ label, value, sub, spark, icon, color = "#00E5FF" }: { label: string; value: string; sub?: string; spark?: number[]; icon: React.ReactNode; color?: string }) {
  const pos = sub && !sub.startsWith("-");
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-opacity-60 transition-all" style={{ borderColor: `color-mix(in srgb, ${color} 20%, var(--border))` }}>
      <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.04] pointer-events-none" style={{ background: `radial-gradient(circle, ${color}, transparent)` }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>{icon}</div>
        {spark && <Sparkline data={spark} color={color} />}
      </div>
      <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-medium">{label}</p>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-[28px] font-bold leading-none tracking-tight">{value}</span>
        {sub && <span className={`flex items-center gap-0.5 text-[11px] font-semibold mb-1 ${pos ? "text-[#10b981]" : "text-[var(--text-muted)]"}`}>{pos && <TrendingUp size={11} />}{sub}</span>}
      </div>
    </div>
  );
}

/* ═══ AREA CHART ═══ */
function AreaChart({ data, labels, color = "#00E5FF" }: { data: number[]; labels: string[]; color?: string }) {
  if (!data.length) return <p className="text-[var(--text-muted)] text-sm py-10 text-center">Sin datos</p>;
  const max = Math.max(...data, 1);
  const W = 620, H = 180, pad = { t: 20, r: 10, b: 30, l: 50 };
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
  const pts = data.map((v, i) => ({ x: pad.l + (i / Math.max(data.length - 1, 1)) * cw, y: pad.t + ch - (v / max) * ch }));
  const line = pts.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1].x} ${pad.t + ch} L ${pad.l} ${pad.t + ch} Z`;
  const grid = [0, 0.25, 0.5, 0.75, 1].map(p => ({ y: pad.t + ch * (1 - p), v: Math.round(max * p) }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0.02" /></linearGradient></defs>
      {grid.map((g, i) => <g key={i}><line x1={pad.l} y1={g.y} x2={W - pad.r} y2={g.y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 4" /><text x={pad.l - 6} y={g.y + 3} textAnchor="end" fill="var(--text-muted)" fontSize="9">{g.v}</text></g>)}
      <path d={area} fill="url(#ag)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--surface)" stroke={color} strokeWidth="1.5" className="opacity-0 hover:opacity-100 transition-opacity"><title>{labels[i]}: {data[i]}</title></circle>)}
      {labels.map((l, i) => i % Math.max(1, Math.ceil(labels.length / 7)) === 0 || i === labels.length - 1 ? <text key={i} x={pad.l + (i / Math.max(data.length - 1, 1)) * cw} y={H - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="9">{l}</text> : null)}
    </svg>
  );
}

/* ═══ DONUT CHART ═══ */
function Donut({ segments, size = 160 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, g) => s + g.value, 0) || 1;
  const cx = size / 2, cy = size / 2, r = size * 0.36, sw = size * 0.13;
  let angle = -90;
  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const a1 = (angle * Math.PI) / 180; angle += pct * 360;
          const a2 = (angle * Math.PI) / 180;
          const d = `M ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${cx + r * Math.cos(a2)} ${cy + r * Math.sin(a2)}`;
          return <path key={i} d={d} fill="none" stroke={seg.color} strokeWidth={sw} strokeLinecap="round" />;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--text-primary)" fontSize="22" fontWeight="700">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text-muted)" fontSize="9">Total</text>
      </svg>
      <div className="space-y-2">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-[11px] text-[var(--text-muted)]">{s.label}</span>
            <span className="text-[11px] font-semibold ml-auto">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ BAR CHART (vertical) ═══ */
function Bars({ data, labels, colors }: { data: number[]; labels: string[]; colors?: string[] }) {
  const max = Math.max(...data, 1);
  const dc = ["#00E5FF", "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"];
  return (
    <div className="flex items-end gap-3 h-[130px]">
      {data.map((v, i) => {
        const c = colors ? colors[i % colors.length] : dc[i % dc.length];
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${labels[i]}: ${v}`}>
            <span className="text-[10px] font-bold text-[var(--text-muted)]">{v}</span>
            <div className="w-full rounded-t-lg transition-all duration-700 ease-out" style={{ height: `${Math.max((v / max) * 100, 6)}%`, background: `linear-gradient(to top, ${c}, color-mix(in srgb, ${c} 60%, white))`, minHeight: 6 }} />
            <span className="text-[8px] text-[var(--text-muted)] truncate w-full text-center leading-tight">{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══ PIPELINE FUNNEL ═══ */
function Funnel({ stages }: { stages: { label: string; count: number; color: string }[] }) {
  const max = Math.max(...stages.map(s => s.count), 1);
  return (
    <div className="space-y-2.5">
      {stages.map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-[10px] text-[var(--text-muted)] w-20 text-right truncate">{s.label}</span>
          <div className="flex-1 h-7 rounded-lg overflow-hidden bg-[var(--surface-light)]">
            <div className="h-full rounded-lg flex items-center px-2.5 transition-all duration-700" style={{ width: `${Math.max((s.count / max) * 100, 10)}%`, background: `linear-gradient(90deg, ${s.color}, color-mix(in srgb, ${s.color} 50%, transparent))` }}>
              <span className="text-[10px] font-bold text-white drop-shadow-sm">{s.count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══ MAIN ═══ */
export default function Analytics({ clients }: { clients: Client[] }) {
  const [loading, setLoading] = useState(true);
  const [negocios, setNegocios] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try { const r = await fetch("https://n8n.grupoexcelsior.co/webhook/guardar-negocio?action=list"); const d = await r.json(); setNegocios(d.negocios || []); }
      catch {} finally { setLoading(false); }
    })();
  }, []);

  const s = useMemo(() => {
    const clientes = clients.filter(c => c.estado === "Cliente").length;
    const prospectos = clients.filter(c => c.estado === "Prospecto").length;
    const polizas = clients.reduce((a, c) => a + (c.total_polizas || 0), 0);
    const convRate = clientes + prospectos > 0 ? Math.round((clientes / (clientes + prospectos)) * 100) : 0;
    const activeDeals = negocios.filter(n => n.etapa !== "perdido").length;
    const lostDeals = negocios.filter(n => n.etapa === "perdido").length;

    // Pipeline
    const stgL: Record<string, string> = { contacto_inicial: "Contacto", negocio_frio: "Contacto", analisis_tecnico: "Análisis", propuesta: "Propuesta", seguimiento: "Seguimiento", emitido: "Emitido", recaudo: "Recaudo" };
    const stgC: Record<string, string> = { contacto_inicial: "#3B82F6", negocio_frio: "#3B82F6", analisis_tecnico: "#F59E0B", propuesta: "#8B5CF6", seguimiento: "#06B6D4", emitido: "#10B981", recaudo: "#00E5FF" };
    const stgMap: Record<string, number> = {};
    for (const n of negocios) { if (n.etapa === "perdido") continue; const l = stgL[n.etapa] || n.etapa; stgMap[l] = (stgMap[l] || 0) + 1; }
    const pipeline = Object.entries(stgL).reduce((acc, [k, l]) => { if (!acc.find(a => a.label === l)) acc.push({ label: l, count: stgMap[l] || 0, color: stgC[k] || "#666" }); return acc; }, [] as { label: string; count: number; color: string }[]);

    // Tipos póliza
    const tc = ["#00E5FF", "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"];
    const tm: Record<string, number> = {};
    for (const c of clients) { if (c.tipo_poliza) for (const t of c.tipo_poliza.split(",").map(x => x.trim())) if (t && t !== "—") tm[t] = (tm[t] || 0) + 1; }
    const tipos = Object.entries(tm).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([l, v], i) => ({ label: l, value: v, color: tc[i % tc.length] }));

    // Aseguradoras
    const am: Record<string, number> = {};
    for (const c of clients) { if (c.aseguradora) for (const a of c.aseguradora.split(",").map(x => x.trim())) if (a && a !== "—") { const sh = a.length > 18 ? a.substring(0, 16) + "…" : a; am[sh] = (am[sh] || 0) + 1; } }
    const aseg = Object.entries(am).sort((a, b) => b[1] - a[1]).slice(0, 6);

    // Registros mensuales (últimos 6 meses)
    const md: Record<string, number> = {}; const ml: string[] = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; md[k] = 0; ml.push(d.toLocaleDateString("es-CO", { month: "short" })); }
    for (const c of clients) { if (c.fecha) { const m = c.fecha.substring(0, 7); if (md[m] !== undefined) md[m]++; } }
    const mv = Object.values(md);

    return { clientes, prospectos, polizas, convRate, activeDeals, lostDeals, pipeline, tipos, aseg, mv, ml };
  }, [clients, negocios]);

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw size={20} className="animate-spin text-[var(--text-muted)]" /></div>;

  return (
    <div className="space-y-6 animate-slide-in-left">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KPI label="Clientes Activos" value={String(s.clientes)} sub={`+${s.prospectos} prospectos`} spark={s.mv} icon={<Users size={18} />} color="#00E5FF" />
        <KPI label="Pólizas Totales" value={String(s.polizas)} spark={s.mv.map(v => v * 2)} icon={<Shield size={18} />} color="#3B82F6" />
        <KPI label="Negocios Activos" value={String(s.activeDeals)} sub={s.lostDeals > 0 ? `${s.lostDeals} perdidos` : undefined} spark={[3, 5, 4, 7, 6, 8, s.activeDeals]} icon={<Activity size={18} />} color="#8B5CF6" />
        <KPI label="Tasa Conversión" value={`${s.convRate}%`} sub={s.convRate >= 70 ? "+alto" : undefined} spark={[60, 65, 70, s.convRate, s.convRate]} icon={<TrendingUp size={18} />} color="#10B981" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="text-[15px] font-bold">Registros por Mes</h3><p className="text-[11px] text-[var(--text-muted)]">Últimos 6 meses</p></div>
            <BarChart3 size={16} className="text-[var(--text-muted)]" />
          </div>
          <AreaChart data={s.mv} labels={s.ml} color="#00E5FF" />
        </div>
        <div className="col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="text-[15px] font-bold">Distribución Pólizas</h3><p className="text-[11px] text-[var(--text-muted)]">Por tipo de seguro</p></div>
            <PieChart size={16} className="text-[var(--text-muted)]" />
          </div>
          {s.tipos.length > 0 ? <Donut segments={s.tipos} /> : <p className="text-sm text-[var(--text-muted)] py-10 text-center">Sin datos</p>}
        </div>
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="text-[15px] font-bold">Embudo Pipeline</h3><p className="text-[11px] text-[var(--text-muted)]">{negocios.length} negocios totales</p></div>
            <Activity size={16} className="text-[var(--text-muted)]" />
          </div>
          <Funnel stages={s.pipeline} />
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="text-[15px] font-bold">Top Aseguradoras</h3><p className="text-[11px] text-[var(--text-muted)]">Clientes por aseguradora</p></div>
            <DollarSign size={16} className="text-[var(--text-muted)]" />
          </div>
          {s.aseg.length > 0 ? <Bars data={s.aseg.map(([, v]) => v)} labels={s.aseg.map(([k]) => k)} /> : <p className="text-sm text-[var(--text-muted)] py-10 text-center">Sin datos</p>}
        </div>
      </div>
    </div>
  );
}
