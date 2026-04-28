"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { FileText, Calendar, TrendingUp, Search, RefreshCw, FolderOpen, Loader2 } from "lucide-react";
import type { Client } from "../page";

type TimePeriod = "hoy" | "semana" | "mes" | "bimestre" | "trimestre" | "semestre" | "anual" | "todos";
const TIME_PERIODS: { id: TimePeriod; label: string; days: number }[] = [
  { id: "hoy", label: "Hoy", days: 0 }, { id: "semana", label: "Semana", days: 7 }, { id: "mes", label: "Mes", days: 30 },
  { id: "bimestre", label: "Bimestre", days: 60 }, { id: "trimestre", label: "Trimestre", days: 90 },
  { id: "semestre", label: "Semestre", days: 180 }, { id: "anual", label: "Anual", days: 365 }, { id: "todos", label: "Todos", days: 99999 },
];

const N8N_DOCS_API = "https://n8n.grupoexcelsior.co/webhook/api-documentos";

interface DocItem { id: string; archivo: string; clientName: string; cedula: string; tipo: string; aseguradora: string; fecha: string; folderId: string; source: "poliza" | "upload"; }

export default function BusinessTracker({ clients }: { clients: Client[] }) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("todos");
  const [searchQuery, setSearchQuery] = useState(""); const [typeFilter, setTypeFilter] = useState(""); const [asegFilter, setAsegFilter] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState<DocItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchUploadedDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const r = await fetch(N8N_DOCS_API);
      const text = await r.text();
      if (!text) { setLoadingDocs(false); return; }
      const data = JSON.parse(text);
      if (data.documentos && Array.isArray(data.documentos)) {
        setUploadedDocs(data.documentos.map((d: any) => ({
          id: d.id || "DOC-" + Math.random().toString(36).substring(2, 8),
          archivo: d.archivo || "", clientName: d.cliente || "", cedula: d.cedula || "",
          tipo: d.subcarpeta || "General", aseguradora: "",
          fecha: d.fecha || "", folderId: d.drive_id || "", source: "upload" as const,
        })));
      }
    } catch { /* API might not exist yet */ }
    setLoadingDocs(false);
  }, []);

  useEffect(() => { fetchUploadedDocs(); }, [fetchUploadedDocs, refreshKey]);

  const allDocs: DocItem[] = useMemo(() => {
    const docs: DocItem[] = [];
    clients.forEach(c => {
      (c.polizas || []).forEach(p => {
        if (!p.archivo) return;
        docs.push({ id: p.id, archivo: p.archivo, clientName: c.nombre, cedula: c.cedula, tipo: p.tipo_poliza, aseguradora: p.aseguradora, fecha: p.fecha_registro || "", folderId: c.folder_id || "", source: "poliza" });
      });
    });
    const existingKeys = new Set(docs.map(d => `${d.archivo}|${d.cedula}`));
    uploadedDocs.forEach(ud => {
      const key = `${ud.archivo}|${ud.cedula}`;
      if (!existingKeys.has(key)) { docs.push(ud); existingKeys.add(key); }
    });
    return docs.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  }, [clients, uploadedDocs, refreshKey]);

  const filtered = useMemo(() => {
    let r = [...allDocs];
    if (timePeriod !== "todos") {
      const period = TIME_PERIODS.find(t => t.id === timePeriod);
      if (period) {
        const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        r = r.filter(d => {
          if (!d.fecha) return false;
          const date = new Date(d.fecha); if (isNaN(date.getTime())) return false;
          if (timePeriod === "hoy") return date >= today;
          const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - period.days);
          return date >= cutoff;
        });
      }
    }
    if (searchQuery) { const q = searchQuery.toLowerCase(); r = r.filter(d => d.archivo.toLowerCase().includes(q) || d.clientName.toLowerCase().includes(q) || d.cedula.includes(q)); }
    if (typeFilter) r = r.filter(d => d.tipo === typeFilter);
    if (asegFilter) r = r.filter(d => d.aseguradora === asegFilter);
    return r;
  }, [allDocs, timePeriod, searchQuery, typeFilter, asegFilter]);

  const policyTypes = useMemo(() => [...new Set(allDocs.map(d => d.tipo).filter(Boolean))], [allDocs]);
  const aseguradoras = useMemo(() => [...new Set(allDocs.map(d => d.aseguradora).filter(Boolean))], [allDocs]);

  const historyCounts = useMemo(() => {
    return TIME_PERIODS.filter(t => t.id !== "todos").map(period => {
      const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const cutoff = period.id === "hoy" ? today : new Date(today.getTime() - period.days * 86400000);
      const count = allDocs.filter(d => { if (!d.fecha) return false; const dt = new Date(d.fecha); return !isNaN(dt.getTime()) && dt >= cutoff; }).length;
      return { ...period, count };
    });
  }, [allDocs]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, DocItem[]> = {};
    filtered.forEach(d => { const dk = d.fecha ? d.fecha.split("T")[0] : "sin-fecha"; if (!groups[dk]) groups[dk] = []; groups[dk].push(d); });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  return (
    <div className="animate-fade-in">
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 mb-6" style={{ boxShadow: "var(--shadow)" }}>
        <div className="flex items-center gap-2 mb-4"><TrendingUp size={18} className="text-[var(--accent)]" /><span className="text-[15px] font-semibold">Historial de Documentos Cargados</span></div>
        <div className="grid grid-cols-7 gap-2">
          {historyCounts.map(p => (<button key={p.id} onClick={() => setTimePeriod(p.id)} className={`flex flex-col items-center p-3 rounded-xl border transition-all ${timePeriod === p.id ? "bg-[var(--accent-glow)] border-[var(--accent)] text-[var(--accent)]" : "bg-[var(--surface-light)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]"}`}><span className="text-xl font-bold">{p.count}</span><span className="text-[11px] uppercase tracking-wider">{p.label}</span></button>))}
        </div>
      </div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--surface)] rounded-xl border border-[var(--border)] w-[260px]"><Search size={16} className="text-[var(--text-muted)]" /><input placeholder="Buscar documento..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] text-[14px] placeholder:text-[var(--text-muted)]" /></div>
        <div className="flex items-center gap-1 bg-[var(--surface)] rounded-xl border border-[var(--border)] p-1">
          {TIME_PERIODS.filter(t => ["hoy", "semana", "mes", "todos"].includes(t.id)).map(tf => (<button key={tf.id} onClick={() => setTimePeriod(tf.id)} className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${timePeriod === tf.id ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}>{tf.label}</button>))}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[13px] text-[var(--text-secondary)] outline-none"><option value="">Tipo / Subcarpeta</option>{policyTypes.map(t => <option key={t} value={t}>{t}</option>)}</select>
        {aseguradoras.length > 0 && <select value={asegFilter} onChange={e => setAsegFilter(e.target.value)} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[13px] text-[var(--text-secondary)] outline-none"><option value="">Aseguradora</option>{aseguradoras.map(a => <option key={a} value={a}>{a}</option>)}</select>}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setRefreshKey(k => k+1)} className="p-2 rounded-lg bg-[var(--surface-light)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)]">
            {loadingDocs ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
          <span className="text-[13px] text-[var(--text-muted)]">{filtered.length} documento{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <div className="space-y-5">
        {groupedByDate.length === 0 ? (
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-12 text-center"><FileText size={36} className="text-[var(--text-muted)] mx-auto mb-3" /><p className="text-[15px] text-[var(--text-muted)]">No hay documentos para este periodo</p></div>
        ) : groupedByDate.map(([date, docList]) => {
          let dateLabel = date;
          try { const d = new Date(date + "T00:00:00"); const today = new Date(); today.setHours(0,0,0,0); const y = new Date(today); y.setDate(y.getDate()-1); dateLabel = d.getTime()===today.getTime() ? "Hoy" : d.getTime()===y.getTime() ? "Ayer" : d.toLocaleDateString("es-CO", { weekday:"long", day:"numeric", month:"long", year:"numeric" }); } catch {}
          return (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2"><Calendar size={14} className="text-[var(--accent)]" /><span className="text-[13px] font-semibold text-[var(--text-secondary)] capitalize">{dateLabel}</span><span className="text-[12px] text-[var(--text-muted)]">({docList.length})</span><div className="flex-1 h-px bg-[var(--border)] ml-2" /></div>
              <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden" style={{ boxShadow: "var(--shadow)" }}>
                {docList.map((doc, i) => (
                  <div key={doc.id + i} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--surface-hover)] cursor-pointer transition-all ${i < docList.length - 1 ? "border-b border-[var(--border)]" : ""}`} onClick={() => doc.folderId && window.open(`https://drive.google.com/open?id=${doc.folderId}`, '_blank')}>
                    <FileText size={18} className={doc.source === "upload" ? "text-[var(--accent)]" : "text-[var(--red)]"} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium truncate">{doc.archivo}</div>
                      <div className="flex items-center gap-2 mt-0.5"><span className="text-[12px] text-[var(--text-muted)]">{doc.clientName}</span><span className="text-[12px] text-[var(--text-muted)]">• CC {doc.cedula}</span></div>
                    </div>
                    {doc.tipo && <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--accent-glow)] text-[var(--accent)]">{doc.tipo}</span>}
                    {doc.aseguradora && <span className="text-[12px] text-[var(--text-muted)] w-28 text-right">{doc.aseguradora}</span>}
                    {doc.folderId && <FolderOpen size={14} className="text-[var(--text-muted)] shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
