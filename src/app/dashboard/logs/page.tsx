'use client'

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  ScrollText, 
  RotateCcw, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Activity,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Settings2,
  Calendar
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState("videos");
  
  // Videos state
  const [videos, setVideos] = useState<any[]>([]);
  const [vPage, setVPage] = useState(1);
  const [vTotalPages, setVTotalPages] = useState(1);
  const [vLoading, setVLoading] = useState(true);
  
  // Videos filters
  const [vSearch, setVSearch] = useState("");
  const [vStatus, setVStatus] = useState("all");
  const [vDateFrom, setVDateFrom] = useState("");
  const [vDateTo, setVDateTo] = useState("");

  // Syncs state
  const [syncs, setSyncs] = useState<any[]>([]);
  const [sPage, setSPage] = useState(1);
  const [sTotalPages, setSTotalPages] = useState(1);
  const [sLoading, setSLoading] = useState(true);

  const fetchVideos = async () => {
    try {
      setVLoading(true);
      const params = new URLSearchParams({
        type: "videos",
        page: vPage.toString(),
        limit: "10",
        search: vSearch,
        status: vStatus,
      });
      if (vDateFrom) params.append("dateFrom", vDateFrom);
      if (vDateTo) params.append("dateTo", vDateTo);

      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();
      if (data.data) {
        setVideos(data.data);
        setVTotalPages(data.totalPages);
      }
    } catch (e) {
      toast.error("Error al cargar registros de videos");
    } finally {
      setVLoading(false);
    }
  };

  const fetchSyncs = async () => {
    try {
      setSLoading(true);
      const params = new URLSearchParams({
        type: "syncs",
        page: sPage.toString(),
        limit: "10",
      });
      if (vDateFrom) params.append("dateFrom", vDateFrom);
      if (vDateTo) params.append("dateTo", vDateTo);

      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();
      if (data.data) {
        setSyncs(data.data);
        setSTotalPages(data.totalPages);
      }
    } catch (e) {
      toast.error("Error al cargar registros de sincronización");
    } finally {
      setSLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "videos") {
      fetchVideos();
    } else {
      fetchSyncs();
    }
  }, [activeTab, vPage, sPage, vStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setVPage(1);
    fetchVideos();
  };

  return (
    <div className="flex flex-col gap-6 animate-pop-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight text-slate-100">
            Registros y Actividad
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-1">
            Historial detallado de videos procesados y ejecuciones del sistema.
          </p>
        </div>
        <Button 
          variant="outline" 
          className="w-fit gap-2"
          onClick={() => activeTab === 'videos' ? fetchVideos() : fetchSyncs()}
        >
          <RotateCcw className="h-4 w-4" />
          <span>Actualizar</span>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-black/40 border border-white/[0.08]">
          <TabsTrigger value="videos" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300">
            <PlayCircle className="w-4 h-4 mr-2" />
            Videos Procesados
          </TabsTrigger>
          <TabsTrigger value="syncs" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
            <Activity className="w-4 h-4 mr-2" />
            Ejecuciones de Sinc.
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {/* Filters Bar */}
          <div className="glass-card p-4 rounded-t-2xl border border-b-0 border-white/[0.08] flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
            {activeTab === "videos" ? (
              <form onSubmit={handleSearch} className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar video..."
                  value={vSearch}
                  onChange={(e) => setVSearch(e.target.value)}
                  className="pl-9 bg-black/40 border-white/[0.1] h-9 text-sm"
                />
              </form>
            ) : <div />}

            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {activeTab === "videos" && (
                <Select value={vStatus} onValueChange={(val) => val && setVStatus(val)}>
                  <SelectTrigger className="w-[140px] h-9 bg-black/40 border-white/[0.1] text-xs">
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
              
              <div className="flex items-center gap-2">
                <Input 
                  type="date" 
                  value={vDateFrom}
                  onChange={(e) => setVDateFrom(e.target.value)}
                  className="w-32 h-9 bg-black/40 border-white/[0.1] text-xs"
                />
                <span className="text-slate-500 text-xs">-</span>
                <Input 
                  type="date" 
                  value={vDateTo}
                  onChange={(e) => setVDateTo(e.target.value)}
                  className="w-32 h-9 bg-black/40 border-white/[0.1] text-xs"
                />
              </div>
              
              <Button type="button" onClick={() => activeTab === 'videos' ? fetchVideos() : fetchSyncs()} size="sm" variant="secondary" className="h-9">
                Filtrar
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="glass-card rounded-b-2xl border border-white/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              {activeTab === "videos" && (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-black/20 border-b border-white/[0.08]">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Video</th>
                      <th className="px-4 py-3">Canal / Lista</th>
                      <th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vLoading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i} className="border-b border-white/[0.04]">
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-6 w-20 rounded-full" /></td>
                        </tr>
                      ))
                    ) : videos.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                          No se encontraron registros de videos.
                        </td>
                      </tr>
                    ) : (
                      videos.map((v) => (
                        <tr key={v.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-slate-300">
                            {format(new Date(v.processedAt), "dd MMM, HH:mm", { locale: es })}
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            <p className="line-clamp-2 leading-tight">{v.videoTitle}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-slate-300 truncate max-w-[150px]">{v.channelName}</span>
                              <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{v.playlistName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {v.status === 'added' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Agregado
                              </span>
                            ) : v.status === 'error' ? (
                              <div className="flex flex-col gap-1 group">
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs w-fit">
                                  <XCircle className="w-3.5 h-3.5" />
                                  Error
                                </span>
                                <span className="text-[10px] text-rose-400/80 max-w-[200px] truncate" title={v.errorMessage}>{v.errorMessage}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1 group">
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs w-fit">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Omitido
                                </span>
                                <span className="text-[10px] text-amber-400/80 max-w-[200px] truncate" title={v.errorMessage}>{v.errorMessage}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === "syncs" && (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-black/20 border-b border-white/[0.08]">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Resumen de Proceso</th>
                      <th className="px-4 py-3">Cuota YT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sLoading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i} className="border-b border-white/[0.04]">
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-6 w-16 rounded-full" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-64" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                        </tr>
                      ))
                    ) : syncs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                          No se encontraron ejecuciones.
                        </td>
                      </tr>
                    ) : (
                      syncs.map((s) => (
                        <tr key={s.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-slate-300">
                            {format(new Date(s.startedAt), "dd MMM, HH:mm", { locale: es })}
                          </td>
                          <td className="px-4 py-3">
                            {s.executionType === 'manual' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-medium uppercase tracking-wider">
                                Manual
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-300 border border-slate-500/20 text-[10px] font-medium uppercase tracking-wider">
                                Auto
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-4 text-xs text-slate-300">
                              <div title="Videos Encontrados" className="flex items-center gap-1.5"><Search className="w-3.5 h-3.5 text-slate-500"/> {s.videosFound}</div>
                              <div title="Videos Agregados" className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/> {s.videosAdded}</div>
                              <div title="Videos Omitidos" className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-500"/> {s.videosFiltered}</div>
                              <div title="Errores" className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-rose-500"/> {s.videosErrored}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono-numbers text-slate-400">
                            {s.quotaUsed} pts
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
            
            {/* Pagination footer */}
            <div className="px-4 py-3 border-t border-white/[0.08] flex items-center justify-between bg-black/20">
              <span className="text-xs text-slate-400">
                Página {activeTab === "videos" ? vPage : sPage} de {activeTab === "videos" ? vTotalPages : sTotalPages}
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  disabled={activeTab === "videos" ? vPage === 1 : sPage === 1}
                  onClick={() => activeTab === "videos" ? setVPage(p => p - 1) : setSPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  disabled={activeTab === "videos" ? vPage === vTotalPages : sPage === sTotalPages}
                  onClick={() => activeTab === "videos" ? setVPage(p => p + 1) : setSPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
