"use client";
import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Shield, Code, Briefcase, Eye, EyeOff, Trash2, RefreshCw, CheckCircle2, XCircle, Edit2, Save, X, UserPlus, Loader2 } from "lucide-react";

const N8N_AUTH = "https://n8n.grupoexcelsior.co/webhook/auth";

interface User {
  id: string; email: string; nombre: string; rol: string; activo: boolean; fecha: string;
}

const ROLES = [
  { id: "admin", label: "Administrador", icon: Shield, color: "#EF4444", desc: "Acceso total al sistema" },
  { id: "desarrollador", label: "Desarrollador", icon: Code, color: "#8B5CF6", desc: "Acceso total + configuración" },
  { id: "gestor", label: "Gestor", icon: Briefcase, color: "#3B82F6", desc: "Clientes, pipeline, chat, documentos" },
];

export default function AdminPanel({ currentUser }: { currentUser: { token: string; rol: string } }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  // New user form
  const [newEmail, setNewEmail] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRol, setNewRol] = useState("gestor");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(N8N_AUTH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_users", adminToken: currentUser.token })
      });
      const data = await res.json();
      if (data.success) setUsers(data.users || []);
    } catch {} finally { setLoading(false); }
  }, [currentUser.token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async () => {
    if (!newEmail.trim() || !newNombre.trim()) { setError("Email y nombre son requeridos"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(N8N_AUTH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_user",
          adminToken: currentUser.token,
          email: newEmail.trim(),
          password: newPassword || "excelsior123",
          nombre: newNombre.trim(),
          rol: newRol
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Usuario ${newNombre} creado exitosamente`);
        setShowCreate(false); setNewEmail(""); setNewNombre(""); setNewPassword(""); setNewRol("gestor");
        fetchUsers();
        setTimeout(() => setSuccess(""), 3000);
      } else { setError(data.error || "Error al crear usuario"); }
    } catch { setError("Error de conexión"); }
    finally { setSaving(false); }
  };

  const isAdmin = currentUser.rol === "admin" || currentUser.rol === "desarrollador";

  return (
    <div className="space-y-6 animate-slide-in-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-bold flex items-center gap-2"><Users size={22} /> Gestión de Usuarios</h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">{users.length} usuario{users.length !== 1 ? "s" : ""} registrado{users.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchUsers} className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)]">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {isAdmin && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-dark))" }}>
              <UserPlus size={15} /> Nuevo Usuario
            </button>
          )}
        </div>
      </div>

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--green-glow)] border border-green-500/20">
          <CheckCircle2 size={16} className="text-[var(--green)]" />
          <span className="text-[13px] text-[var(--green)] font-medium">{success}</span>
        </div>
      )}

      {/* Create user form */}
      {showCreate && (
        <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface)] p-5 space-y-4" style={{ background: "color-mix(in srgb, var(--accent) 3%, var(--surface))" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold flex items-center gap-2"><UserPlus size={16} className="text-[var(--accent)]" /> Crear Nuevo Usuario</h3>
            <button onClick={() => { setShowCreate(false); setError(""); }} className="p-1.5 rounded-lg hover:bg-[var(--surface-light)] text-[var(--text-muted)]"><X size={16} /></button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-[var(--text-muted)] uppercase font-medium">Nombre completo *</label>
              <input value={newNombre} onChange={e => setNewNombre(e.target.value)} placeholder="María García" className="w-full bg-[var(--surface-light)] border border-[var(--border)] rounded-xl px-4 py-3 text-[14px] outline-none mt-1 focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-[11px] text-[var(--text-muted)] uppercase font-medium">Email *</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="usuario@excelsior.com" className="w-full bg-[var(--surface-light)] border border-[var(--border)] rounded-xl px-4 py-3 text-[14px] outline-none mt-1 focus:border-[var(--accent)]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-[var(--text-muted)] uppercase font-medium">Contraseña</label>
              <div className="relative mt-1">
                <input type={showPw ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="excelsior123 (por defecto)" className="w-full bg-[var(--surface-light)] border border-[var(--border)] rounded-xl px-4 py-3 pr-10 text-[14px] outline-none focus:border-[var(--accent)]" />
                <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-[var(--text-muted)] uppercase font-medium">Rol</label>
              <div className="flex gap-2 mt-1">
                {ROLES.map(r => (
                  <button key={r.id} onClick={() => setNewRol(r.id)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl text-[12px] font-semibold border transition-all ${newRol === r.id ? "border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]"}`}>
                    <r.icon size={13} />{r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Role description */}
          <p className="text-[11px] text-[var(--text-muted)] px-1">{ROLES.find(r => r.id === newRol)?.desc}</p>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--red-glow)] border border-red-500/20">
              <XCircle size={14} className="text-[var(--red)]" />
              <span className="text-[12px] text-[var(--red)]">{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={() => { setShowCreate(false); setError(""); }} className="flex-1 px-4 py-3 rounded-xl text-[13px] font-medium border border-[var(--border)] text-[var(--text-muted)]">Cancelar</button>
            <button onClick={handleCreate} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[13px] font-semibold text-white disabled:opacity-60" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-dark))" }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              {saving ? "Creando..." : "Crear Usuario"}
            </button>
          </div>
        </div>
      )}

      {/* Users list */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><RefreshCw size={20} className="animate-spin text-[var(--text-muted)]" /></div>
      ) : (
        <div className="grid gap-3">
          {users.map(u => {
            const roleInfo = ROLES.find(r => r.id === u.rol) || ROLES[2];
            const RoleIcon = roleInfo.icon;
            return (
              <div key={u.id} className="flex items-center gap-4 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-opacity-60 transition-all">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[15px] font-bold text-white shrink-0" style={{ background: `linear-gradient(135deg, ${roleInfo.color}, color-mix(in srgb, ${roleInfo.color} 70%, #000))` }}>
                  {(u.nombre || "U").charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold truncate">{u.nombre}</span>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase" style={{ background: `color-mix(in srgb, ${roleInfo.color} 15%, transparent)`, color: roleInfo.color }}>
                      <RoleIcon size={10} className="inline mr-0.5" />{roleInfo.label}
                    </span>
                    {u.activo ? (
                      <span className="w-2 h-2 rounded-full bg-[var(--green)]" title="Activo" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[var(--red)]" title="Inactivo" />
                    )}
                  </div>
                  <p className="text-[12px] text-[var(--text-muted)] truncate">{u.email}</p>
                </div>

                {/* Date */}
                <span className="text-[11px] text-[var(--text-muted)] shrink-0">{u.fecha ? new Date(u.fecha).toLocaleDateString("es-CO") : "—"}</span>
              </div>
            );
          })}

          {users.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users size={32} className="text-[var(--text-muted)] mb-3 opacity-30" />
              <p className="text-[14px] text-[var(--text-muted)]">No hay usuarios registrados</p>
              <p className="text-[12px] text-[var(--text-muted)] mt-1">Crea el primer usuario con el botón de arriba</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
