'use client'

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  RotateCcw,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Activity,
  Radio,
  Timer,
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
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useFitPageSize } from "@/hooks/use-fit-page-size";
import {
  SyncDetailDialog,
  formatSyncDuration,
  getSyncState,
  type SyncLogSummary,
} from "@/components/logs/sync-detail-dialog";
import { toast } from "sonner";

/** Alto fijo de cada fila de la tabla en escritorio (px). */
const ROW_HEIGHT = 56;
/** Alto reservado para el encabezado de la tabla (px). */
const THEAD_HEIGHT = 40;

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

function SyncStateBadge({ s }: { s: SyncLogSummary }) {
  const state = getSyncState(s);
  if (state === "done") return null;
  return state === "running" ? (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/25 text-[10px] font-medium">
      En curso
    </span>
  ) : (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/25 text-[10px] font-medium">
      Interrumpida
    </span>
  );
}

function SyncSummary({ s }: { s: SyncLogSummary }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-300 font-mono-numbers">
      <div title="Videos encontrados" className="flex items-center gap-1.5"><Search className="w-3.5 h-3.5 text-slate-500" /> {s.videosFound}</div>
      <div title="Videos agregados" className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {s.videosAdded}</div>
      <div title="Videos omitidos" className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> {s.videosFiltered}</div>
      <div title="Errores" className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-rose-500" /> {s.videosErrored}</div>
    </div>
  );
}

export default function LogsPage() {
  const [syncs, setSyncs] = useState<SyncLogSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Ejecución seleccionada (abre el detalle)
  const [selected, setSelected] = useState<SyncLogSummary | null>(null);

  // Cantidad de filas que entran en pantalla (escritorio) o tamaño fijo (mobile)
  const { measure: measureRows, pageSize: limit } = useFitPageSize({
    rowHeight: ROW_HEIGHT,
    reserved: THEAD_HEIGHT,
    minRows: 3,
    mobilePageSize: 10,
  });

  // Evita que una respuesta vieja pise a una más nueva
  const requestIdRef = useRef(0);

  const fetchSyncs = async (targetPage = page) => {
    if (!limit) return;
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: "syncs",
        page: targetPage.toString(),
        limit: limit.toString(),
        executionType: typeFilter,
      });
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();
      if (requestId !== requestIdRef.current) return;
      if (data.data) {
        setSyncs(data.data);
        setTotalPages(Math.max(1, data.totalPages));
        setTotal(data.total ?? 0);
      }
    } catch {
      toast.error("Error al cargar el historial de ejecuciones");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  // Si cambia la cantidad de filas visibles, volver a la primera página
  useEffect(() => {
    setPage(1);
  }, [limit]);

  useEffect(() => {
    if (!limit) return;
    fetchSyncs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, typeFilter, limit]);

  const applyFilters = () => {
    setPage(1);
    fetchSyncs(1);
  };

  const skeletonRows = Math.min(limit ?? 5, 8);

  return (
    <div className="flex flex-col gap-4 md:h-full md:min-h-0 animate-pop-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-100">
            Registros de Ejecuciones
          </h1>
          <p className="text-slate-400 text-sm mt-0.5 sm:truncate">
            Historial de sincronizaciones. Tocá una ejecución para ver todos los videos que procesó.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-fit gap-2 shrink-0"
          onClick={() => fetchSyncs()}
        >
          <RotateCcw className="h-4 w-4" />
          <span>Actualizar</span>
        </Button>
      </div>

      <div className="flex flex-col md:flex-1 md:min-h-0">
        {/* Filters Bar */}
        <div className="glass-card p-2.5 rounded-t-2xl border border-b-0 border-white/[0.08] flex flex-col lg:flex-row gap-2.5 lg:items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span>
              <strong className="text-slate-200 font-mono-numbers">{total}</strong>{" "}
              {total === 1 ? "ejecución" : "ejecuciones"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full lg:w-auto">
            <Select value={typeFilter} onValueChange={(val) => val && setTypeFilter(val)}>
              <SelectTrigger className="col-span-2 sm:col-span-1 w-full sm:w-[150px] h-9 bg-black/40 border-white/[0.1] text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="auto">Automáticas</SelectItem>
                <SelectItem value="manual">Manuales</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              aria-label="Desde"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full sm:w-36 h-9 bg-black/40 border-white/[0.1] text-xs"
            />
            <Input
              type="date"
              aria-label="Hasta"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
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
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-black/20 border-b border-white/[0.08]">
                  <tr className="h-10">
                    <th className="px-4">Fecha</th>
                    <th className="px-4">Tipo</th>
                    <th className="px-4">Resumen de Proceso</th>
                    <th className="px-4 hidden lg:table-cell">Canales</th>
                    <th className="px-4 hidden lg:table-cell">Duración</th>
                    <th className="px-4">Cuota YT</th>
                    <th className="px-4 w-32"><span className="sr-only">Detalle</span></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(skeletonRows)].map((_, i) => (
                      <tr key={i} className="h-14 border-b border-white/[0.04]">
                        <td className="px-4"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                        <td className="px-4"><Skeleton className="h-4 w-56" /></td>
                        <td className="px-4 hidden lg:table-cell"><Skeleton className="h-4 w-10" /></td>
                        <td className="px-4 hidden lg:table-cell"><Skeleton className="h-4 w-12" /></td>
                        <td className="px-4"><Skeleton className="h-4 w-12" /></td>
                        <td className="px-4"><Skeleton className="h-7 w-24 rounded-lg" /></td>
                      </tr>
                    ))
                  ) : syncs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                        No se encontraron ejecuciones.
                      </td>
                    </tr>
                  ) : (
                    syncs.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => setSelected(s)}
                        className="h-14 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer group"
                      >
                        <td className="px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-slate-200 text-xs font-semibold first-letter:uppercase">
                              {format(new Date(s.startedAt), "EEE d MMM", { locale: es })}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono-numbers">
                              {format(new Date(s.startedAt), "HH:mm", { locale: es })} hs
                            </span>
                          </div>
                        </td>
                        <td className="px-4">
                          <div className="flex items-center gap-1.5">
                            <SyncTypeBadge type={s.executionType} />
                            <SyncStateBadge s={s} />
                          </div>
                        </td>
                        <td className="px-4"><SyncSummary s={s} /></td>
                        <td className="px-4 hidden lg:table-cell text-xs text-slate-400 font-mono-numbers">{s.channelsChecked}</td>
                        <td className="px-4 hidden lg:table-cell text-xs text-slate-400 font-mono-numbers">
                          {formatSyncDuration(s.startedAt, s.finishedAt) ?? "—"}
                        </td>
                        <td className="px-4 font-mono-numbers text-slate-400 text-xs">{s.quotaUsed} pts</td>
                        <td className="px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(s);
                            }}
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-semibold text-indigo-300 border border-indigo-500/20 bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors cursor-pointer"
                          >
                            Ver videos
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Mobile: tarjetas ── */}
            <div className="md:hidden divide-y divide-white/[0.05]">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="p-3.5 space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))
              ) : syncs.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-400">No se encontraron ejecuciones.</p>
              ) : (
                syncs.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelected(s)}
                    className="w-full text-left p-3.5 flex items-center gap-3 active:bg-white/[0.03] cursor-pointer"
                  >
                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-200 font-semibold first-letter:uppercase">
                          {format(new Date(s.startedAt), "EEE d MMM, HH:mm", { locale: es })}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <SyncStateBadge s={s} />
                          <SyncTypeBadge type={s.executionType} />
                        </div>
                      </div>
                      <SyncSummary s={s} />
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono-numbers">
                        <span className="inline-flex items-center gap-1"><Radio className="h-3 w-3" /> {s.channelsChecked} canales</span>
                        <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" /> {formatSyncDuration(s.startedAt, s.finishedAt) ?? "—"}</span>
                        <span>{s.quotaUsed} pts</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Pagination footer */}
          <div className="px-3 sm:px-4 py-2.5 border-t border-white/[0.08] bg-black/20 shrink-0">
            <PaginationBar
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              accent="emerald"
              summary={
                <>
                  Página <strong className="text-slate-200">{page}</strong> de{" "}
                  <strong className="text-slate-200">{totalPages}</strong>
                </>
              }
            />
          </div>
        </div>
      </div>

      <SyncDetailDialog sync={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
