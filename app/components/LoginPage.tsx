"use client";
import { useState } from "react";
import { Shield, Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import Image from "next/image";

interface User {
  id: string;
  email: string;
  nombre: string;
  rol: "admin" | "desarrollador" | "gestor";
  avatar: string;
  token: string;
}

const N8N_AUTH = "https://n8n.grupoexcelsior.co/webhook/auth";

export default function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError("Ingresa email y contraseña"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(N8N_AUTH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email: email.trim(), password })
      });
      const data = await res.json();
      if (data.success && data.user) {
        localStorage.setItem("excelsior-token", data.user.token);
        localStorage.setItem("excelsior-user", JSON.stringify(data.user));
        sessionStorage.setItem("excelsior-session-alive", "1");
        onLogin(data.user);
      } else {
        setError(data.error || "Credenciales incorrectas");
      }
    } catch {
      setError("Error de conexión con el servidor");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      {/* Background effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, var(--accent), transparent)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-[0.02]" style={{ background: "radial-gradient(circle, #8B5CF6, transparent)" }} />
      </div>

      <div className="relative w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "var(--accent-glow)" }}>
            <Shield size={32} style={{ color: "var(--accent)" }} />
          </div>
          <h1 className="text-[24px] font-bold tracking-tight">Excelsior Seguros</h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">Plataforma de Gestión</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
          <div>
            <label className="text-[12px] text-[var(--text-muted)] uppercase font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="correo@excelsior.com"
              className="w-full bg-[var(--surface-light)] border border-[var(--border)] rounded-xl px-4 py-3 text-[14px] outline-none mt-1.5 focus:border-[var(--accent)] transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[12px] text-[var(--text-muted)] uppercase font-medium">Contraseña</label>
            <div className="relative mt-1.5">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="••••••••"
                className="w-full bg-[var(--surface-light)] border border-[var(--border)] rounded-xl px-4 py-3 pr-11 text-[14px] outline-none focus:border-[var(--accent)] transition-colors"
              />
              <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--red-glow)] border border-red-500/20">
              <AlertTriangle size={14} className="text-[var(--red)] shrink-0" />
              <span className="text-[12px] text-[var(--red)]">{error}</span>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-dark))" }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>
        </div>

        <p className="text-center text-[11px] text-[var(--text-muted)] mt-6">
          Excelsior Seguros © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
