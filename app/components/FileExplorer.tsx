"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Folder, FileText, ChevronRight, Home, Search, X, Loader2, Download, ExternalLink, FileImage, FileSpreadsheet, Eye, ArrowLeft, RefreshCw } from "lucide-react";

const ROOT_CLIENTES = "1IEoJ177orI52FmVksI7WM_ik-pM5K9rw";
const ROOT_PROSPECTOS = "1iVtXus_CPvwJ8wYtNgslFuU3-myLb1FQ";

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  size: number | null;
  modifiedTime: string;
  webViewLink: string;
  thumbnailLink: string | null;
  parents: string[];
}

interface BreadcrumbEntry {
  id: string;
  name: string;
}

function getFileIcon(mimeType: string, size = 18) {
  if (mimeType === "application/vnd.google-apps.folder") return <Folder size={size} className="text-[var(--accent)]" />;
  if (mimeType.startsWith("image/")) return <FileImage size={size} className="text-[var(--purple)]" />;
  if (mimeType === "application/pdf") return <FileText size={size} className="text-[var(--red)]" />;
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv")) return <FileSpreadsheet size={size} className="text-[var(--green)]" />;
  if (mimeType.includes("document") || mimeType.includes("word")) return <FileText size={size} className="text-[var(--accent)]" />;
  return <FileText size={size} className="text-[var(--text-muted)]" />;
}

function formatSize(size: number | null) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
  } catch { return iso; }
}

export default function FileExplorer() {
  const [crumbs, setCrumbs] = useState<BreadcrumbEntry[]>([{ id: "root", name: "Archivos" }]);
  const [currentFolder, setCurrentFolder] = useState<string>("root"); // 'root' = vista de las dos raíces
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DriveItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preview
  const [preview, setPreview] = useState<DriveItem | null>(null);

  const loadFolder = useCallback(async (folderId: string) => {
    if (folderId === "root") {
      // Mostrar las dos carpetas raíz como elementos virtuales
      setItems([
        {
          id: ROOT_CLIENTES,
          name: "Clientes IA",
          mimeType: "application/vnd.google-apps.folder",
          isFolder: true,
          size: null,
          modifiedTime: "",
          webViewLink: `https://drive.google.com/drive/folders/${ROOT_CLIENTES}`,
          thumbnailLink: null,
          parents: [],
        },
        {
          id: ROOT_PROSPECTOS,
          name: "Prospectos IA",
          mimeType: "application/vnd.google-apps.folder",
          isFolder: true,
          size: null,
          modifiedTime: "",
          webViewLink: `https://drive.google.com/drive/folders/${ROOT_PROSPECTOS}`,
          thumbnailLink: null,
          parents: [],
        },
      ]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/drive/list?folder_id=${folderId}&page_size=200`);
      const data = await r.json();
      if (!data.ok) throw new Error(data.error || "Error al cargar");
      setItems(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar carpeta");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFolder(currentFolder);
  }, [currentFolder, loadFolder]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/drive/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await r.json();
        setSearchResults(data.items || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const handleItemClick = (item: DriveItem) => {
    if (item.isFolder) {
      setCrumbs(prev => [...prev, { id: item.id, name: item.name }]);
      setCurrentFolder(item.id);
      setSearchQuery("");
      setSearchResults(null);
    } else {
      setPreview(item);
    }
  };

  const goToCrumb = (idx: number) => {
    const newCrumbs = crumbs.slice(0, idx + 1);
    setCrumbs(newCrumbs);
    setCurrentFolder(newCrumbs[newCrumbs.length - 1].id);
    setSearchQuery("");
    setSearchResults(null);
  };

  const displayItems = searchResults !== null ? searchResults : items;
  const folders = displayItems.filter(i => i.isFolder);
  const files = displayItems.filter(i => !i.isFolder);

  return (
    <div className="flex h-full">
      {/* Panel principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header con breadcrumbs */}
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 mb-3">
            <h1 className="text-[20px] font-bold">Archivos</h1>
            <span className="text-[12px] px-2 py-0.5 rounded-md bg-[var(--accent-glow)] text-[var(--accent)] font-semibold">Drive</span>
            <button onClick={() => loadFolder(currentFolder)} disabled={loading} className="ml-auto p-2 rounded-lg hover:bg-[var(--surface-light)] text-[var(--text-muted)] disabled:opacity-50" title="Recargar">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-[13px] flex-wrap">
            {crumbs.map((c, idx) => (
              <div key={`${c.id}-${idx}`} className="flex items-center gap-1.5">
                {idx > 0 && <ChevronRight size={12} className="text-[var(--text-muted)]" />}
                <button
                  onClick={() => goToCrumb(idx)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md ${idx === crumbs.length - 1 ? "text-[var(--text-primary)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--surface-light)]"}`}
                >
                  {idx === 0 && <Home size={12} />}
                  <span className="truncate max-w-[200px]">{c.name}</span>
                </button>
              </div>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar en todo el Drive (mín. 2 letras)..."
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg pl-9 pr-9 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchResults(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={14} />
              </button>
            )}
          </div>
          {searchResults !== null && (
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5 ml-1">
              {searching ? "Buscando..." : `${searchResults.length} resultado(s) en todo el Drive`}
            </p>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
              <Loader2 size={20} className="animate-spin mr-2" />Cargando...
            </div>
          )}

          {error && (
            <div className="px-4 py-3 mb-4 rounded-xl bg-[var(--red-glow)] border border-red-500/30 text-[var(--red)] text-[13px]">
              {error}
            </div>
          )}

          {!loading && !error && displayItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
              <Folder size={48} className="opacity-30 mb-3" />
              <p className="text-[14px]">{searchResults !== null ? "Sin resultados" : "Carpeta vacía"}</p>
            </div>
          )}

          {!loading && folders.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[11px] font-semibold uppercase text-[var(--text-muted)] mb-2 tracking-wider">Carpetas ({folders.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {folders.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="group flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-light)] text-left transition-all"
                  >
                    {getFileIcon(item.mimeType, 18)}
                    <span className="text-[13px] font-medium truncate flex-1">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && files.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold uppercase text-[var(--text-muted)] mb-2 tracking-wider">Archivos ({files.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {files.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="group flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-light)] text-left transition-all min-w-0"
                  >
                    {getFileIcon(item.mimeType, 18)}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{item.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{formatSize(item.size)} · {formatDate(item.modifiedTime)}</p>
                    </div>
                    <Eye size={13} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Panel lateral de preview */}
      {preview && (
        <PreviewPanel item={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

function PreviewPanel({ item, onClose }: { item: DriveItem; onClose: () => void }) {
  const previewUrl = `/api/drive/preview?file_id=${item.id}`;
  const isImage = item.mimeType.startsWith("image/");
  const isPdf = item.mimeType === "application/pdf";
  const isOfficeOrGdoc = item.mimeType.startsWith("application/vnd.google-apps") || item.mimeType.includes("officedocument");

  return (
    <div className="w-[420px] xl:w-[500px] border-l border-[var(--border)] bg-[var(--bg)] flex flex-col">
      <div className="p-4 border-b border-[var(--border)] flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold truncate">{item.name}</p>
          <p className="text-[11px] text-[var(--text-muted)]">{formatSize(item.size)} · {formatDate(item.modifiedTime)}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-light)] text-[var(--text-muted)]">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-[var(--surface)]">
        {isImage && (
          <img src={previewUrl} alt={item.name} className="w-full h-auto" />
        )}
        {isPdf && (
          <iframe src={previewUrl} className="w-full h-full min-h-[600px]" title={item.name} />
        )}
        {!isImage && !isPdf && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            {getFileIcon(item.mimeType, 48)}
            <p className="text-[13px] text-[var(--text-muted)] mt-3 mb-4">
              {isOfficeOrGdoc ? "Este tipo de archivo se ve mejor en Drive" : "Vista previa no disponible"}
            </p>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[var(--border)] flex gap-2">
        <a
          href={item.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-[12px] font-semibold hover:opacity-90"
        >
          <ExternalLink size={13} />Abrir en Drive
        </a>
        <a
          href={previewUrl}
          download={item.name}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--surface-light)] border border-[var(--border)] text-[12px] font-semibold text-[var(--text-primary)] hover:bg-[var(--border)]"
        >
          <Download size={13} />Descargar
        </a>
      </div>
    </div>
  );
}
