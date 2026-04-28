"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Shield, Car, Home, Heart, Briefcase, FileText, Plane, Building2, Sparkles, ArrowRight } from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  shield: Shield, car: Car, home: Home, heart: Heart,
  briefcase: Briefcase, file: FileText, plane: Plane,
  building: Building2, sparkles: Sparkles,
};

interface Formulario {
  id: string;
  nombre_ramo: string;
  icono: string;
  slug: string;
  descripcion?: string;
  preguntas: { id: string }[];
}

export default function CotizarIndex() {
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/formularios");
        const d = await r.json();
        if (d.ok) {
          // Solo los activos
          const activos = (d.formularios || []).filter((f: Formulario & { activo: boolean }) => f.activo);
          setFormularios(activos);
        }
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header con logo */}
      <header className="bg-white border-b border-gray-200 py-5 px-6">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Image src="/logo3.png" alt="Excelsior" width={48} height={48} className="rounded-xl" />
          <div>
            <h1 className="text-[16px] font-bold text-gray-900 leading-tight">EXCELSIOR AGENCIA DE SEGUROS</h1>
            <p className="text-[12px] text-gray-500">Cotiza el seguro que necesitas</p>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h2 className="text-[24px] md:text-[28px] font-bold text-gray-900 mb-2">¿Qué seguro necesitas?</h2>
          <p className="text-[14px] text-gray-600">Selecciona una opción y nosotros te ayudamos</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : formularios.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <Shield size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-[15px] text-gray-700 font-medium">No hay productos disponibles en este momento</p>
            <p className="text-[12px] text-gray-500 mt-1">Por favor contáctanos directamente al WhatsApp</p>
            <a href="https://wa.me/573150733399" target="_blank" rel="noreferrer" className="inline-flex mt-4 px-5 py-2.5 bg-green-500 text-white rounded-xl text-[13px] font-semibold hover:bg-green-600">
              Contactar por WhatsApp
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {formularios.map(f => {
              const Icon = ICON_MAP[f.icono] || Shield;
              return (
                <Link
                  key={f.id}
                  href={`/cotizar/${f.slug}`}
                  className="group flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition">
                    <Icon size={22} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-semibold text-gray-900 truncate">{f.nombre_ramo}</h3>
                    {f.descripcion && <p className="text-[12px] text-gray-500 truncate mt-0.5">{f.descripcion}</p>}
                  </div>
                  <ArrowRight size={18} className="text-gray-400 group-hover:text-blue-600 transition shrink-0" />
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-[12px] text-gray-500">
            ¿Prefieres hablar con un asesor?{" "}
            <a href="https://wa.me/573150733399" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline">
              Contáctanos por WhatsApp
            </a>
          </p>
        </div>
      </main>

      <footer className="text-center py-6 text-[11px] text-gray-400">
        © {new Date().getFullYear()} Grupo Excelsior · Todos los derechos reservados
      </footer>
    </div>
  );
}
