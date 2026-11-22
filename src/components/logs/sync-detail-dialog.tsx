'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  Info,
  ListVideo,
  Search,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

export interface SyncLogSummary {
  id: string
  executionType: string
  channelsChecked: number
  videosFound: number
  videosAdded: number
  videosFiltered: number
  videosErrored: number
  quotaUsed: number
  startedAt: string
  finishedAt: string | null
}

interface SyncVideo {
  id: string
  videoId: string
  videoTitle: string | null
  status: 'added' | 'filtered' | 'error'
  errorMessage: string | null
  publishedAt: string | null
  processedAt: string
  channelName: string
  channelThumbnail: string | null
  playlistName: string
  playlistId: string
}

type StatusFilter = 'all' | 'added' | 'filtered' | 'error'

export function formatSyncDuration(startedAt: string, finishedAt: string | null): string | null {
  if (!finishedAt) return null
  const secs = Math.max(0, Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000))
  if (secs < 60) return `${secs} s`
  const mins = Math.floor(secs / 60)
  const rest = secs % 60
  return rest > 0 ? `${mins} min ${rest} s` : `${mins} min`
}

/** Una ejecución sin hora de fin: en curso si empezó hace poco, interrumpida si no. */
export function getSyncState(sync: Pick<SyncLogSummary, 'startedAt' | 'finishedAt'>): 'done' | 'running' | 'interrupted' {
  if (sync.finishedAt) return 'done'
  return Date.now() - new Date(sync.startedAt).getTime() < 10 * 60 * 1000 ? 'running' : 'interrupted'
}

const statusMeta: Record<SyncVideo['status'], { label: string; icon: typeof CheckCircle2; pill: string; text: string }> = {
  added: { label: 'Agregado', icon: CheckCircle2, pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', text: 'text-emerald-400/80' },
  filtered: { label: 'Omitido', icon: AlertTriangle, pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20', text: 'text-amber-400/80' },
  error: { label: 'Error', icon: XCircle, pill: 'bg-rose-500/10 text-rose-400 border-rose-500/20', text: 'text-rose-400/80' },
}

interface SyncDetailDialogProps {
  sync: SyncLogSummary | null
  onOpenChange: (open: boolean) => void
}

export function SyncDetailDialog({ sync, onOpenChange }: SyncDetailDialogProps) {
  const [videos, setVideos] = useState<SyncVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [approximate, setApproximate] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')

  const syncId = sync?.id

  useEffect(() => {
    if (!syncId) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setVideos([])
      setStatusFilter('all')
      setSearch('')
      try {
        const res = await fetch(`/api/logs?type=syncVideos&syncId=${encodeURIComponent(syncId)}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al cargar los videos')
        if (cancelled) return
        setVideos(data.videos)
        setApproximate(!!data.approximate)
        setTruncated(!!data.truncated)
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Error al cargar los videos de la ejecución')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [syncId])

  const counts = useMemo(
    () => ({
      all: videos.length,
      added: videos.filter((v) => v.status === 'added').length,
      filtered: videos.filter((v) => v.status === 'filtered').length,
      error: videos.filter((v) => v.status === 'error').length,
    }),
    [videos]
  )

  const visibleVideos = useMemo(() => {
    const q = search.trim().toLowerCase()
    return videos.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false
      if (!q) return true
      return (
        (v.videoTitle ?? '').toLowerCase().includes(q) ||
        v.channelName.toLowerCase().includes(q) ||
        v.playlistName.toLowerCase().includes(q)
      )
    })
  }, [videos, statusFilter, search])

  const state = sync ? getSyncState(sync) : 'done'
  const duration = sync ? formatSyncDuration(sync.startedAt, sync.finishedAt) : null
  const isManual = sync?.executionType === 'manual'

  const tabs: Array<{ key: StatusFilter; label: string; active: string }> = [
    { key: 'all', label: 'Todos', active: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30' },
    { key: 'added', label: 'Agregados', active: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30' },
    { key: 'filtered', label: 'Omitidos', active: 'bg-amber-600/20 text-amber-300 border-amber-500/30' },
    { key: 'error', label: 'Errores', active: 'bg-rose-600/20 text-rose-300 border-rose-500/30' },
  ]

  return (
    <Dialog open={!!sync} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/[0.08] sm:max-w-3xl p-0 gap-0 bg-[#0f1523]/95 backdrop-blur-xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[85dvh] overflow-hidden">
        {sync && (
          <>
            {/* Encabezado */}
            <div className="p-4 sm:p-5 border-b border-white/[0.06] flex flex-col gap-4 shrink-0">
              <DialogHeader className="gap-1 text-left pr-8">
                <DialogTitle className="font-display font-bold text-lg text-slate-100 flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      'p-1.5 rounded-lg border',
                      isManual
                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    )}
                  >
                    <Activity className="h-4 w-4" />
                  </span>
                  Ejecución {isManual ? 'manual' : 'automática'}
                  {state !== 'done' && (
                    <span
                      className={cn(
                        'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border',
                        state === 'running'
                          ? 'bg-sky-500/10 text-sky-300 border-sky-500/25'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                      )}
                    >
                      {state === 'running' ? 'En curso' : 'Interrumpida'}
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="first-letter:uppercase">
                    {format(new Date(sync.startedAt), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
                  </span>
                  {duration && <span className="text-slate-500">· duró {duration}</span>}
                  <span className="text-slate-500">· {sync.channelsChecked} canales revisados</span>
                </DialogDescription>
              </DialogHeader>

              {/* Resumen */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { label: 'Encontrados', value: sync.videosFound, icon: Search, cls: 'text-slate-200', ic: 'text-slate-400' },
                  { label: 'Agregados', value: sync.videosAdded, icon: CheckCircle2, cls: 'text-emerald-300', ic: 'text-emerald-400' },
                  { label: 'Omitidos', value: sync.videosFiltered, icon: AlertTriangle, cls: 'text-amber-300', ic: 'text-amber-400' },
                  { label: 'Errores', value: sync.videosErrored, icon: XCircle, cls: 'text-rose-300', ic: 'text-rose-400' },
                  { label: 'Cuota YT', value: `${sync.quotaUsed}`, icon: Gauge, cls: 'text-teal-300', ic: 'text-teal-400', suffix: 'pts' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-2.5 py-2 flex flex-col gap-0.5 min-w-0">
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-slate-500 truncate">
                      <s.icon className={`h-3 w-3 shrink-0 ${s.ic}`} />
                      {s.label}
                    </span>
                    <span className={`text-lg font-display font-black font-mono-numbers leading-tight ${s.cls}`}>
                      {s.value}
                      {s.suffix && <span className="text-[10px] font-normal text-slate-500 ml-1">{s.suffix}</span>}
                    </span>
                  </div>
                ))}
              </div>

              {/* Filtros del detalle */}
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1">
                  {tabs.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setStatusFilter(t.key)}
                      className={cn(
                        'h-8 px-2.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                        statusFilter === t.key
                          ? t.active
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                      )}
                    >
                      {t.label}
                      <span className="ml-1.5 font-mono-numbers opacity-70">{counts[t.key]}</span>
                    </button>
                  ))}
                </div>
                <div className="relative sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar video, canal o lista..."
                    className="pl-8 pr-8 h-8 bg-black/30 border-white/[0.08] text-xs"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      aria-label="Limpiar búsqueda"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Lista de videos (scroll interno) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3">
              {loading ? (
                <div className="flex flex-col gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-3 p-2">
                      <Skeleton className="w-28 aspect-video rounded-lg shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-5 w-20 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : visibleVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-6">
                  <div className="p-3 rounded-full bg-white/[0.03] border border-white/[0.06] mb-3">
                    <ListVideo className="h-6 w-6 text-slate-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300">
                    {videos.length === 0 ? 'Esta ejecución no procesó videos nuevos' : 'Sin coincidencias'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    {videos.length === 0
                      ? 'Los videos encontrados ya se habían evaluado en ejecuciones anteriores o los canales no publicaron nada nuevo en las últimas 48 horas.'
                      : 'Probá con otro filtro o término de búsqueda.'}
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {visibleVideos.map((v) => {
                    const meta = statusMeta[v.status]
                    return (
                      <li
                        key={v.id}
                        className="flex gap-3 p-2 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/[0.05] transition-colors"
                      >
                        <a
                          href={`https://www.youtube.com/watch?v=${v.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative w-24 sm:w-32 aspect-video rounded-lg overflow-hidden shrink-0 border border-white/10 bg-slate-900 group"
                          title="Ver en YouTube"
                        >
                          <img
                            src={`https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </a>
                        <div className="min-w-0 flex-1 flex flex-col gap-1">
                          <a
                            href={`https://www.youtube.com/watch?v=${v.videoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-slate-200 leading-snug line-clamp-2 hover:text-indigo-300 transition-colors"
                            title={v.videoTitle ?? undefined}
                          >
                            {v.videoTitle || v.videoId}
                          </a>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 min-w-0">
                            {v.channelThumbnail ? (
                              <img src={v.channelThumbnail} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                            ) : null}
                            <span className="truncate">{v.channelName}</span>
                            <span className="text-slate-600 shrink-0">→</span>
                            <a
                              href={`https://www.youtube.com/playlist?list=${v.playlistId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-violet-300/80 hover:text-violet-300"
                            >
                              {v.playlistName}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-medium', meta.pill)}>
                              <meta.icon className="h-3 w-3" />
                              {meta.label}
                            </span>
                            {v.status !== 'added' && v.errorMessage && (
                              <span className={cn('text-[11px] line-clamp-1', meta.text)} title={v.errorMessage}>
                                {v.errorMessage}
                              </span>
                            )}
                            {v.publishedAt && (
                              <span className="text-[10px] text-slate-500 ml-auto shrink-0">
                                publicado {formatDistanceToNow(new Date(v.publishedAt), { addSuffix: true, locale: es })}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Notas al pie */}
            <div className="px-4 sm:px-5 py-2.5 border-t border-white/[0.06] bg-black/20 text-[11px] text-slate-500 flex items-start gap-1.5 shrink-0">
              <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
              <span className="flex flex-col gap-0.5">
                <span>
                  Cada sincronización revisa los videos de las últimas 48 h, así que algunos ya los había revisado la
                  ejecución anterior. Esos no se vuelven a procesar ni aparecen acá; por eso &ldquo;Encontrados&rdquo; puede ser
                  mayor que la suma del resto.
                </span>
                {approximate && (
                  <span className="text-amber-300/80">
                    Esta ejecución es anterior a la mejora de los registros: sus videos se estimaron según la hora en que se
                    procesaron, así que puede faltar alguno o aparecer con otro estado.
                  </span>
                )}
                {truncated && <span>Se muestran los primeros 1000 videos.</span>}
              </span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
