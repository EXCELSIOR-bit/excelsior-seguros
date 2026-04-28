"use client";
import { Users, TrendingUp, CheckCircle, FileText } from "lucide-react";
import type { Client } from "../page";

interface DashboardProps {
  clients: Client[];
  loading: boolean;
}

function StatCard({ icon, label, value, color, glow, loading }: {
  icon: React.ReactNode; label: string; value: number | string;
  color: string; glow: string; loading: boolean;
}) {
  return (
    <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)] relative overflow-hidden group hover:-translate-y-0.5 transition-all">
      <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full blur-[30px]" style={{ background: glow }} />
      <div className="flex items-center justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: glow, color }}>
          {icon}
        </div>
      </div>
      {loading ? (
        <div className="h-9 w-16 bg-[var(--surface-light)] rounded-lg animate-pulse" />
      ) : (
        <div className="text-[30px] font-bold text-[var(--text-primary)] tracking-tight">{value}</div>
      )}
      <div className="text-[13px] text-[var(--text-muted)] mt-1">{label}</div>
    </div>
  );
}

export default function Dashboard({ clients, loading }: DashboardProps) {
  const stats = {
    total: clients.length,
    prospectos: clients.filter((c) => c.estado === "Prospecto").length,
    clientes: clients.filter((c) => c.estado === "Cliente").length,
  };

  // Count policies
  const policyCounts: Record<string, number> = {};
  clients.forEach((c) => {
    if (c.tipo_poliza) {
      policyCounts[c.tipo_poliza] = (policyCounts[c.tipo_poliza] || 0) + 1;
    }
  });
  const policies = Object.entries(policyCounts).map(([type, count]) => ({
    type,
    count,
    pct: stats.total > 0 ? Math.round((count / stats.total) * 100) : 0,
  }));

  // Recent clients (sorted by date desc)
  const recent = [...clients]
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""))
    .slice(0, 5);

  const colors = ["var(--green)", "var(--blue)", "var(--accent)", "var(--purple)", "var(--red)"];

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-4 gap-5 mb-8">
        <StatCard icon={<Users size={20} />} label="Total Registros" value={stats.total} color="var(--blue)" glow="var(--blue-glow)" loading={loading} />
        <StatCard icon={<TrendingUp size={20} />} label="Prospectos" value={stats.prospectos} color="var(--accent)" glow="var(--accent-glow)" loading={loading} />
        <StatCard icon={<CheckCircle size={20} />} label="Clientes" value={stats.clientes} color="var(--green)" glow="var(--green-glow)" loading={loading} />
        <StatCard icon={<FileText size={20} />} label="Tipos de Póliza" value={policies.length} color="var(--purple)" glow="var(--purple-glow)" loading={loading} />
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Recent */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
          <h3 className="text-base font-semibold mb-4">Registros Recientes</h3>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-[var(--surface-light)] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="text-sm text-[var(--text-muted)] text-center py-8">No hay registros aún</div>
          ) : (
            recent.map((client, i) => (
              <div key={i} className={`flex items-center gap-3 py-3 ${i < recent.length - 1 ? "border-b border-[var(--border)]" : ""}`}>
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center text-xs font-bold text-[var(--accent)]">
                  {client.nombre.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{client.nombre}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">{client.cedula} · {client.estado}</div>
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">{client.fecha}</div>
              </div>
            ))
          )}
        </div>

        {/* Policy Distribution */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
          <h3 className="text-base font-semibold mb-4">Distribución por Póliza</h3>
          {loading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-[var(--surface-light)] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : policies.length === 0 ? (
            <div className="text-sm text-[var(--text-muted)] text-center py-8">No hay pólizas registradas</div>
          ) : (
            policies.map((item, i) => (
              <div key={i} className="mb-4">
                <div className="flex justify-between mb-1.5">
                  <span className="text-[13px] text-[var(--text-secondary)]">{item.type}</span>
                  <span className="text-[13px] text-[var(--text-muted)]">{item.count}</span>
                </div>
                <div className="h-1.5 bg-[var(--surface-light)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${item.pct}%`, background: colors[i % colors.length] }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
