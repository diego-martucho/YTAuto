'use client'

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  RotateCcw,
  Search,
  Activity,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useFitPageSize } from "@/hooks/use-fit-page-size";
import { toast } from "sonner";

interface VideoLog {
  id: string;
  videoId: string;
  videoTitle: string | null;
  status: "added" | "filtered" | "error";
  errorMessage: string | null;
  processedAt: string;
  channelName: string;
  playlistName: string;
}

interface SyncLog {
  id: string;
  executionType: string;
  videosFound: number;
  videosAdded: number;
  videosFiltered: number;
  videosErrored: number;
  quotaUsed: number;
  startedAt: string;
}

/** Alto fijo de cada fila de la tabla en escritorio (px). */
const ROW_HEIGHT = 56;
/** Alto reservado para el encabezado de la tabla (px). */
const THEAD_HEIGHT = 40;

function VideoStatusBadge({ v }: { v: VideoLog }) {
  if (v.status === "added") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs w-fit">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Agregado
      </span>
    );
  }
  const isError = v.status === "error";
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs w-fit border ${
          isError
            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
        }`}
      >
        {isError ? <XCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
        {isError ? "Error" : "Omitido"}
      </span>
      {v.errorMessage && (
        <span
          className={`text-[10px] max-w-[220px] truncate ${isError ? "text-rose-400/80" : "text-amber-400/80"}`}
          title={v.errorMessage}
        >
          {v.errorMessage}
        </span>
      )}
    </div>
  );
}

function SyncTypeBadge({ type }: { type: string }) {
  return type === "manual" ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-medium uppercase tracking-wider">
      Manual
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-300 border border-slate-500/20 text-[10px] font-medium uppercase tracking-wider">
      Auto
    </span>
  );
}

function SyncSummary({ s }: { s: SyncLog }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-300 font-mono-numbers">
      <div title="Videos Encontrados" className="flex items-center gap-1.5"><Search className="w-3.5 h-3.5 text-slate-500" /> {s.videosFound}</div>
      <div title="Videos Agregados" className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {s.videosAdded}</div>
      <div title="Videos Omitidos" className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> {s.videosFiltered}</div>
      <div title="Errores" className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-rose-500" /> {s.videosErrored}</div>
    </div>
  );
}

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState("videos");

  // Videos state
  const [videos, setVideos] = useState<VideoLog[]>([]);
  const [vPage, setVPage] = useState(1);
  const [vTotalPages, setVTotalPages] = useState(1);
  const [vTotal, setVTotal] = useState(0);
  const [vLoading, setVLoading] = useState(true);

  // Videos filters
  const [vSearch, setVSearch] = useState("");
  const [vStatus, setVStatus] = useState("all");
  const [vDateFrom, setVDateFrom] = useState("");
  const [vDateTo, setVDateTo] = useState("");

  // Syncs state
  const [syncs, setSyncs] = useState<SyncLog[]>([]);
  const [sPage, setSPage] = useState(1);
  const [sTotalPages, setSTotalPages] = useState(1);
  const [sTotal, setSTotal] = useState(0);
  const [sLoading, setSLoading] = useState(true);

  // Cantidad de filas que entran en pantalla (escritorio) o tamaño fijo (mobile)
  const { measure: measureRows, pageSize: limit } = useFitPageSize({
    rowHeight: ROW_HEIGHT,
    reserved: THEAD_HEIGHT,
    minRows: 3,
    mobilePageSize: 10,
  });

  // Evita que una respuesta vieja pise a una más nueva
  const requestIdRef = useRef(0);

  const fetchVideos = async (page = vPage) => {
    if (!limit) return;
    const requestId = ++requestIdRef.current;
    try {
      setVLoading(true);
      const params = new URLSearchParams({
        type: "videos",
        page: page.toString(),
        limit: limit.toString(),
        search: vSearch,
        status: vStatus,
      });
      if (vDateFrom) params.append("dateFrom", vDateFrom);
      if (vDateTo) params.append("dateTo", vDateTo);

      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();
      if (requestId !== requestIdRef.current) return;
      if (data.data) {
        setVideos(data.data);
        setVTotalPages(Math.max(1, data.totalPages));
        setVTotal(data.total ?? 0);
      }
    } catch {
      toast.error("Error al cargar registros de videos");
    } finally {
      if (requestId === requestIdRef.current) setVLoading(false);
    }
  };

  const fetchSyncs = async (page = sPage) => {
    if (!limit) return;
    const requestId = ++requestIdRef.current;
    try {
      setSLoading(true);
      const params = new URLSearchParams({
        type: "syncs",
        page: page.toString(),
        limit: limit.toString(),
      });
      if (vDateFrom) params.append("dateFrom", vDateFrom);
      if (vDateTo) params.append("dateTo", vDateTo);

      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();
      if (requestId !== requestIdRef.current) return;
      if (data.data) {
        setSyncs(data.data);
        setSTotalPages(Math.max(1, data.totalPages));
        setSTotal(data.total ?? 0);
      }
    } catch {
      toast.error("Error al cargar registros de sincronización");
    } finally {
      if (requestId === requestIdRef.current) setSLoading(false);
    }
  };

  // Si cambia la cantidad de filas visibles, volver a la primera página
  useEffect(() => {
    setVPage(1);
    setSPage(1);
  }, [limit]);

  useEffect(() => {
    if (!limit) return;
    if (activeTab === "videos") {
      fetchVideos();
    } else {
      fetchSyncs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, vPage, sPage, vStatus, limit]);

  const applyFilters = () => {
    if (activeTab === "videos") {
      setVPage(1);
      fetchVideos(1);
    } else {
      setSPage(1);
      fetchSyncs(1);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const isVideos = activeTab === "videos";
  const page = isVideos ? vPage : sPage;
  const totalPages = isVideos ? vTotalPages : sTotalPages;
  const total = isVideos ? vTotal : sTotal;
  const loading = isVideos ? vLoading : sLoading;
  const skeletonRows = Math.min(limit ?? 5, 8);

  return (
    <div className="flex flex-col gap-4 md:h-full md:min-h-0 animate-pop-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-100">
            Registros y Actividad
          </h1>
          <p className="text-slate-400 text-sm mt-0.5 sm:truncate">
            Historial detallado de videos procesados y ejecuciones del sistema.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-fit gap-2 shrink-0"
          onClick={() => (isVideos ? fetchVideos() : fetchSyncs())}
        >
          <RotateCcw className="h-4 w-4" />
          <span>Actualizar</span>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full gap-3 md:flex-1 md:min-h-0">
        <TabsList className="bg-black/40 border border-white/[0.08] w-full sm:w-fit shrink-0">
          <TabsTrigger value="videos" className="data-active:bg-indigo-500/20 data-active:text-indigo-300 px-3">
            <PlayCircle className="w-4 h-4" />
            Videos Procesados
          </TabsTrigger>
          <TabsTrigger value="syncs" className="data-active:bg-emerald-500/20 data-active:text-emerald-300 px-3">
            <Activity className="w-4 h-4" />
            Ejecuciones de Sinc.
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col md:flex-1 md:min-h-0">
          {/* Filters Bar */}
          <div className="glass-card p-2.5 rounded-t-2xl border border-b-0 border-white/[0.08] flex flex-col lg:flex-row gap-2.5 lg:items-center justify-between shrink-0">
            {isVideos ? (
              <form onSubmit={handleSearch} className="relative w-full lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar video..."
                  value={vSearch}
                  onChange={(e) => setVSearch(e.target.value)}
                  className="pl-9 bg-black/40 border-white/[0.1] h-9 text-sm"
                />
              </form>
            ) : (
              <p className="hidden lg:block text-xs text-slate-500 px-1">Filtrá las ejecuciones por rango de fechas.</p>
            )}

            <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full lg:w-auto">
              {isVideos && (
                <Select value={vStatus} onValueChange={(val) => val && setVStatus(val)}>
                  <SelectTrigger className="col-span-2 sm:col-span-1 w-full sm:w-[150px] h-9 bg-black/40 border-white/[0.1] text-xs">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="added">Agregados</SelectItem>
                    <SelectItem value="filtered">Omitidos (Filtro)</SelectItem>
                    <SelectItem value="error">Errores</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Input
                type="date"
                aria-label="Desde"
                value={vDateFrom}
                onChange={(e) => setVDateFrom(e.target.value)}
                className="w-full sm:w-36 h-9 bg-black/40 border-white/[0.1] text-xs"
              />
              <Input
                type="date"
                aria-label="Hasta"
                value={vDateTo}
                onChange={(e) => setVDateTo(e.target.value)}
                className="w-full sm:w-36 h-9 bg-black/40 border-white/[0.1] text-xs"
              />

              <Button type="button" onClick={applyFilters} size="sm" variant="secondary" className="h-9 col-span-2 sm:col-span-1">
                Filtrar
              </Button>
            </div>
          </div>

          {/* Contenedor de resultados: en escritorio ocupa el alto restante */}
          <div className="glass-card rounded-b-2xl border border-white/[0.08] overflow-hidden md:flex-1 md:min-h-0 flex flex-col">
            <div ref={measureRows} className="md:flex-1 md:min-h-0 overflow-hidden">
              {/* ── Escritorio: tabla ── */}
              <div className="hidden md:block">
                {isVideos ? (
                  <table className="w-full text-sm text-left table-fixed">
                    <thead className="text-xs text-slate-400 uppercase bg-black/20 border-b border-white/[0.08]">
                      <tr className="h-10">
                        <th className="px-4 w-32">Fecha</th>
                        <th className="px-4">Video</th>
                        <th className="px-4 w-56">Canal / Lista</th>
                        <th className="px-4 w-60">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vLoading ? (
                        [...Array(skeletonRows)].map((_, i) => (
                          <tr key={i} className="h-14 border-b border-white/[0.04]">
                            <td className="px-4"><Skeleton className="h-4 w-24" /></td>
                            <td className="px-4"><Skeleton className="h-4 w-48" /></td>
                            <td className="px-4"><Skeleton className="h-4 w-32" /></td>
                            <td className="px-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                          </tr>
                        ))
                      ) : videos.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                            No se encontraron registros de videos.
                          </td>
                        </tr>
                      ) : (
                        videos.map((v) => (
                          <tr key={v.id} className="h-14 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 whitespace-nowrap text-slate-300 text-xs font-mono-numbers">
                              {format(new Date(v.processedAt), "dd MMM, HH:mm", { locale: es })}
                            </td>
                            <td className="px-4 text-slate-200">
                              <a
                                href={`https://www.youtube.com/watch?v=${v.videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="line-clamp-2 leading-tight hover:text-indigo-300 transition-colors"
                                title={v.videoTitle ?? undefined}
                              >
                                {v.videoTitle}
                              </a>
                            </td>
                            <td className="px-4">
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-xs font-medium text-slate-300 truncate">{v.channelName}</span>
                                <span className="text-[10px] text-slate-500 truncate">{v.playlistName}</span>
                              </div>
                            </td>
                            <td className="px-4">
                              <VideoStatusBadge v={v} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 uppercase bg-black/20 border-b border-white/[0.08]">
                      <tr className="h-10">
                        <th className="px-4">Fecha</th>
                        <th className="px-4">Tipo</th>
                        <th className="px-4">Resumen de Proceso</th>
                        <th className="px-4">Cuota YT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sLoading ? (
                        [...Array(skeletonRows)].map((_, i) => (
                          <tr key={i} className="h-14 border-b border-white/[0.04]">
                            <td className="px-4"><Skeleton className="h-4 w-24" /></td>
                            <td className="px-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                            <td className="px-4"><Skeleton className="h-4 w-64" /></td>
                            <td className="px-4"><Skeleton className="h-4 w-12" /></td>
                          </tr>
                        ))
                      ) : syncs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                            No se encontraron ejecuciones.
                          </td>
                        </tr>
                      ) : (
                        syncs.map((s) => (
                          <tr key={s.id} className="h-14 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 whitespace-nowrap text-slate-300 text-xs font-mono-numbers">
                              {format(new Date(s.startedAt), "dd MMM, HH:mm", { locale: es })}
                            </td>
                            <td className="px-4"><SyncTypeBadge type={s.executionType} /></td>
                            <td className="px-4"><SyncSummary s={s} /></td>
                            <td className="px-4 font-mono-numbers text-slate-400">{s.quotaUsed} pts</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* ── Mobile: tarjetas ── */}
              <div className="md:hidden divide-y divide-white/[0.05]">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="p-3.5 space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  ))
                ) : isVideos ? (
                  videos.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-slate-400">No se encontraron registros de videos.</p>
                  ) : (
                    videos.map((v) => (
                      <div key={v.id} className="p-3.5 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500 font-mono-numbers">
                            {format(new Date(v.processedAt), "dd MMM, HH:mm", { locale: es })}
                          </span>
                          <VideoStatusBadge v={{ ...v, errorMessage: null }} />
                        </div>
                        <a
                          href={`https://www.youtube.com/watch?v=${v.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-slate-200 leading-snug line-clamp-2"
                        >
                          {v.videoTitle}
                        </a>
                        <p className="text-[11px] text-slate-400 truncate">
                          {v.channelName} <span className="text-slate-600">→</span>{" "}
                          <span className="text-slate-500">{v.playlistName}</span>
                        </p>
                        {v.status !== "added" && v.errorMessage && (
                          <p className={`text-[11px] ${v.status === "error" ? "text-rose-400/80" : "text-amber-400/80"}`}>
                            {v.errorMessage}
                          </p>
                        )}
                      </div>
                    ))
                  )
                ) : syncs.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-slate-400">No se encontraron ejecuciones.</p>
                ) : (
                  syncs.map((s) => (
                    <div key={s.id} className="p-3.5 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-300 font-mono-numbers">
                          {format(new Date(s.startedAt), "dd MMM, HH:mm", { locale: es })}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 font-mono-numbers">{s.quotaUsed} pts</span>
                          <SyncTypeBadge type={s.executionType} />
                        </div>
                      </div>
                      <SyncSummary s={s} />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pagination footer */}
            <div className="px-3 sm:px-4 py-2.5 border-t border-white/[0.08] bg-black/20 shrink-0">
              <PaginationBar
                page={page}
                totalPages={totalPages}
                onPageChange={(p) => (isVideos ? setVPage(p) : setSPage(p))}
                accent={isVideos ? "indigo" : "emerald"}
                summary={
                  <>
                    Página <strong className="text-slate-200">{page}</strong> de{" "}
                    <strong className="text-slate-200">{totalPages}</strong>
                    <span className="text-slate-500">
                      {" "}· {total} {isVideos ? (total === 1 ? "registro" : "registros") : total === 1 ? "ejecución" : "ejecuciones"}
                    </span>
                  </>
                }
              />
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
