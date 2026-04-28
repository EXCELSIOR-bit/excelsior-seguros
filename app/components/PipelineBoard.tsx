"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  UserPlus, BarChart3, FileSpreadsheet, Eye, ClipboardCheck, Receipt, XCircle, Clock,
  Car, Heart, Home, Bike, Shield, Umbrella, FileText, Search, Calendar,
  RefreshCw, Loader2, CheckCircle2
} from "lucide-react";
import type { Client } from "../page";

const WF20 = "https://n8n.grupoexcelsior.co/webhook/guardar-negocio";

type Stage = "contacto_inicial" | "analisis_tecnico" | "propuesta" | "seguimiento" | "emitido" | "recaudo" | "perdido";

const STAGE_CONFIG: Record<Stage, { label: string; shortLabel: string; icon: React.ReactNode; color: string; glow: string }> = {
  contacto_inicial: { label: "Contacto Inicial", shortLabel: "Contacto", icon: <UserPlus size={14} />, color: "#3b82f6", glow: "rgba(59,130,246,0.12)" },
  seguimiento: { label: "Seguimiento", shortLabel: "Seguim.", icon: <Eye size={14} />, color: "#f97316", glow: "rgba(249,115,22,0.12)" },
  propuesta: { label: "Propuesta", shortLabel: "Propuesta", icon: <FileSpreadsheet size={14} />, color: "#8b5cf6", glow: "rgba(139,92,246,0.12)" },
  analisis_tecnico: { label: "Análisis Técnico", shortLabel: "Análisis", icon: <BarChart3 size={14} />, color: "#f59e0b", glow: "rgba(245,158,11,0.12)" },
  emitido: { label: "Emitido", shortLabel: "Emitido", icon: <ClipboardCheck size={14} />, color: "#10b981", glow: "rgba(16,185,129,0.12)" },
  recaudo: { label: "Recaudo", shortLabel: "Recaudo", icon: <Receipt size={14} />, color: "#6366f1", glow: "rgba(99,102,241,0.12)" },
  perdido: { label: "Perdido", shortLabel: "Perdido", icon: <XCircle size={14} />, color: "#ef4444", glow: "rgba(239,68,68,0.12)" },
};

const POLICY_ICONS: Record<string, React.ReactNode> = {
  "autos": <Car size={13} />, "vida": <Heart size={13} />, "hogar": <Home size={13} />,
  "motos": <Bike size={13} />, "salud": <Shield size={13} />, "soat": <Umbrella size={13} />,
};
function getPolIcon(t: string) { return POLICY_ICONS[t.toLowerCase().trim()] || <FileText size={13} />; }

interface PipelineItem {
  id: string; cedula: string; tipo_poliza: string; aseguradora: string;
  etapa: Stage; observacion: string; fecha_creacion: string; fecha_actualizacion: string;
}

function StatCard({ label, value, icon, color, glow }: { label: string; value: number; icon: React.ReactNode; color: string; glow: string }) {
  return (
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 relative overflow-hidden" style={{ boxShadow: "var(--shadow)" }}>
      <div className="absolute top-0 right-0 w-12 h-12 rounded-full -mt-3 -mr-3 opacity-30" style={{ background: glow, filter: "blur(12px)" }} />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: glow, color }}>{icon}</div>
        <div><div className="text-xl font-bold" style={{ color }}>{value}</div><div className="text-[10px] text-[var(--text-muted)] leading-tight">{label}</div></div>
      </div>
    </div>
  );
}

export default function PipelineBoard({ clients, onSelectClient }: { clients: Client[]; onSelectClient?: (client: Client) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "">("");
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiOk, setApiOk] = useState(true);

  const clientMap = useMemo(() => {
    const m: Record<string, Client> = {};
    clients.forEach(c => { m[c.cedula] = c; });
    return m;
  }, [clients]);

  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${WF20}?action=list`);
      const data = await res.json();
      // Map old stage names to new ones
      const mapped = (data.negocios || []).map((n: PipelineItem) => {
        let etapa = n.etapa;
        if (etapa === ("negocio_frio" as any)) etapa = "contacto_inicial";
        return { ...n, etapa };
      }).filter((n: PipelineItem) => n.etapa);
      setItems(mapped);
      setApiOk(true);
    } catch { setApiOk(false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  const filtered = useMemo(() => {
    let result = [...items];
    if (stageFilter) result = result.filter(d => d.etapa === stageFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d =>
        (clientMap[d.cedula]?.nombre || '').toLowerCase().includes(q) ||
        d.cedula.includes(q) ||
        d.tipo_poliza.toLowerCase().includes(q) ||
        d.aseguradora.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, stageFilter, searchQuery, clientMap]);

  const counts = useMemo(() => {
    const c: Record<Stage, number> = { contacto_inicial: 0, analisis_tecnico: 0, propuesta: 0, seguimiento: 0, emitido: 0, recaudo: 0, perdido: 0 };
    filtered.forEach(d => { if (c[d.etapa] !== undefined) c[d.etapa]++; });
    return c;
  }, [filtered]);

  if (loading) return (<div className="flex items-center justify-center py-20 gap-3 text-[var(--text-muted)]"><Loader2 size={20} className="animate-spin" /><span className="text-[15px]">Cargando pipeline...</span></div>);

  return (
    <div className="animate-fade-in">
      {apiOk && <div className="flex items-center gap-2 mb-4 text-[12px] text-[var(--green)]"><CheckCircle2 size={14} /><span>Pipeline conectado — {items.length} negocios</span></div>}

      <div className="grid grid-cols-7 gap-2 mb-5">
        {(Object.keys(STAGE_CONFIG) as Stage[]).map(stage => {
          const cfg = STAGE_CONFIG[stage];
          return <StatCard key={stage} label={cfg.shortLabel} value={counts[stage]} icon={cfg.icon} color={cfg.color} glow={cfg.glow} />;
        })}
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--surface)] rounded-xl border border-[var(--border)] w-[220px]">
          <Search size={15} className="text-[var(--text-muted)]" />
          <input placeholder="Buscar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-muted)]" />
        </div>
        <div className="flex items-center gap-0.5 bg-[var(--surface)] rounded-xl border border-[var(--border)] p-1">
          <button onClick={() => setStageFilter("")} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${!stageFilter ? "bg-[var(--surface-light)] text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>Todas</button>
          {(Object.keys(STAGE_CONFIG) as Stage[]).map(stage => {
            const cfg = STAGE_CONFIG[stage];
            return <button key={stage} onClick={() => setStageFilter(stageFilter === stage ? "" : stage)} className="px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-0.5" style={stageFilter === stage ? { background: cfg.color, color: "white" } : { color: "var(--text-muted)" }}>{cfg.icon}</button>;
          })}
        </div>
        <button onClick={fetchPipeline} className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)]"><RefreshCw size={15} /></button>
        <div className="ml-auto text-[12px] text-[var(--text-muted)]">{filtered.length} negocio{filtered.length !== 1 ? "s" : ""}</div>
      </div>

      {items.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-16 text-center">
          <UserPlus size={36} className="text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-[15px] text-[var(--text-muted)]">No hay negocios en el pipeline.</p>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {(Object.keys(STAGE_CONFIG) as Stage[]).map(stage => {
            const cfg = STAGE_CONFIG[stage];
            const stageItems = filtered.filter(d => d.etapa === stage);
            return (
              <div key={stage} className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden" style={{ boxShadow: "var(--shadow)" }}>
                <div className="px-2.5 py-2.5 border-b border-[var(--border)] flex items-center gap-1.5" style={{ background: cfg.glow }}>
                  <span style={{ color: cfg.color }}>{cfg.icon}</span>
                  <span className="text-[11px] font-semibold truncate" style={{ color: cfg.color }}>{cfg.shortLabel}</span>
                  <span className="ml-auto text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center" style={{ background: cfg.glow, color: cfg.color }}>{stageItems.length}</span>
                </div>
                <div className="p-1.5 space-y-1.5 min-h-[180px] max-h-[450px] overflow-y-auto">
                  {stageItems.length === 0 ? (
                    <div className="text-center py-6 text-[11px] text-[var(--text-muted)]">Vacío</div>
                  ) : stageItems.map(item => {
                    const cl = clientMap[item.cedula];
                    const nombre = cl?.nombre || `CC ${item.cedula}`;
                    return (
                      <div key={item.id} className="p-2.5 rounded-lg bg-[var(--surface-light)] border border-[var(--border)] transition-all hover:border-[var(--accent)] cursor-pointer group" style={{ borderLeftWidth: 3, borderLeftColor: cfg.color }} onClick={() => cl && onSelectClient?.(cl)}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] flex items-center justify-center text-[9px] font-bold text-white shrink-0">{nombre.charAt(0)}</div>
                          <span className="text-[12px] font-semibold truncate group-hover:text-[var(--accent)]">{nombre}</span>
                        </div>
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-[var(--text-muted)]">{getPolIcon(item.tipo_poliza)}</span>
                          <span className="text-[10px] text-[var(--text-muted)] truncate">{item.tipo_poliza}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]">
                          <Clock size={9} />
                          {item.fecha_actualizacion || item.fecha_creacion}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
