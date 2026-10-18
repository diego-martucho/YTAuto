'use client'

import { useState, useEffect } from 'react'
import {
  Radio,
  Video,
  ListVideo,
  GitBranch,
  Clock,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Filter,
  AlertCircle,
  TrendingUp,
  Activity,
  Gauge,
  Zap,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardStats {
  channelsCount: number
  activeChannelsCount: number
  inactiveChannelsCount: number
  playlistsCount: number
  playlistsWithRulesCount: number
  playlistsWithoutRulesCount: number
  totalRulesCount: number
  activeRulesCount: number
  shortsEnabledRulesCount: number
  videosAddedToday: number
  videosProcessedToday: number
  videosFilteredToday: number
  totalVideosProcessed: number
  totalVideosAdded: number
  totalVideosFiltered: number
  totalVideosErrored: number
  filteredByShorts: number
  filteredByTitle: number
  filteredByDuplicate: number
  activeDays: number
  avgDailyAdded: number
  avgDailyProcessed: number
  acceptanceRate: number
  totalSyncsCount: number
  autoSyncsCount: number
  manualSyncsCount: number
  quotaUsedToday: number
  totalQuotaUsed: number
  lastSync: string | null
  lastSyncType: 'auto' | 'manual' | null
  lastSyncAdded: number
  topChannels: Array<{
    id: string
    channelName: string
    channelThumbnail: string | null
    isActive: boolean
    addedCount: number
    processedCount: number
  }>
  topPlaylists: Array<{
    id: string
    playlistId: string
    playlistName: string
    videosAddedCount: number
    rulesCount: number
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/dashboard/stats')
      if (!res.ok) throw new Error('Error al cargar métricas')
      const data = await res.json()
      setStats(data)
    } catch {
      toast.error('Error al cargar datos del panel')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSync = async () => {
    try {
      setIsSyncing(true)
      const res = await fetch('/api/sync/manual', {
        method: 'POST',
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error durante la sincronización')
      }

      toast.success(data.message || 'Sincronización completada correctamente')
      fetchStats()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al sincronizar'
      toast.error(msg)
    } finally {
      setIsSyncing(false)
    }
  }

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 1) return 'Hace un momento'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHours < 24) return `Hoy, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const dailyQuotaLimit = 10000
  const quotaPercentage = Math.min(100, Math.round(((stats?.quotaUsedToday ?? 0) / dailyQuotaLimit) * 100))

  return (
    <div className="flex flex-col gap-7 animate-pop-in">
      {/* Header con botón de Sincronización Manual */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight text-slate-100">
            Panel de Control
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Estadísticas generales, promedios diarios y rendimiento de tu automatización de YouTube.
          </p>
        </div>

        <Button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-600/30 cursor-pointer self-start sm:self-auto shrink-0"
        >
          {isSyncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-indigo-300" />
              Sincronizando videos de hoy...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar ahora (Videos de hoy)
            </>
          )}
        </Button>
      </div>

      {/* FILA 1: Estadísticas de Videos y Promedios Diarios (Cuadrícula Centrada) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Promedio Diario de Videos Agregados */}
        <div className="glass-card-interactive rounded-2xl p-6 border border-white/[0.08] flex flex-col items-center justify-center text-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Promedio Diario Agregados
          </span>
          {loading ? (
            <Skeleton className="h-10 w-24" />
          ) : (
            <div className="text-4xl font-display font-black text-slate-100 font-mono-numbers">
              {stats?.avgDailyAdded ?? 0}
              <span className="text-sm font-normal text-slate-400 ml-1.5">/ día</span>
            </div>
          )}
          {loading ? (
            <Skeleton className="h-5 w-36" />
          ) : (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[11px] font-mono-numbers">
                +{stats?.videosAddedToday ?? 0} hoy
              </Badge>
              <span className="text-[11px] text-slate-500">
                ({stats?.activeDays ?? 1} {stats?.activeDays === 1 ? 'día activo' : 'días activos'})
              </span>
            </div>
          )}
        </div>

        {/* Promedio Diario de Videos Procesados */}
        <div className="glass-card-interactive rounded-2xl p-6 border border-white/[0.08] flex flex-col items-center justify-center text-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Promedio Diario Procesados
          </span>
          {loading ? (
            <Skeleton className="h-10 w-24" />
          ) : (
            <div className="text-4xl font-display font-black text-slate-100 font-mono-numbers">
              {stats?.avgDailyProcessed ?? 0}
              <span className="text-sm font-normal text-slate-400 ml-1.5">/ día</span>
            </div>
          )}
          {loading ? (
            <Skeleton className="h-5 w-36" />
          ) : (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[11px] font-mono-numbers">
                {stats?.videosProcessedToday ?? 0} evaluados hoy
              </Badge>
            </div>
          )}
        </div>

        {/* Total Videos Agregados + Tasa de Aceptación */}
        <div className="glass-card-interactive rounded-2xl p-6 border border-white/[0.08] flex flex-col items-center justify-center text-center gap-3">
          <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <Video className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Videos Agregados
          </span>
          {loading ? (
            <Skeleton className="h-10 w-20" />
          ) : (
            <div className="text-4xl font-display font-black text-slate-100 font-mono-numbers">
              {stats?.totalVideosAdded ?? 0}
            </div>
          )}
          {loading ? (
            <Skeleton className="h-5 w-36" />
          ) : (
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              <span>
                Tasa de aceptación: <strong className="text-violet-300 font-mono-numbers">{stats?.acceptanceRate ?? 0}%</strong>
              </span>
            </div>
          )}
        </div>

        {/* Total Videos Procesados */}
        <div className="glass-card-interactive rounded-2xl p-6 border border-white/[0.08] flex flex-col items-center justify-center text-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Filter className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Videos Procesados
          </span>
          {loading ? (
            <Skeleton className="h-10 w-20" />
          ) : (
            <div className="text-4xl font-display font-black text-slate-100 font-mono-numbers">
              {stats?.totalVideosProcessed ?? 0}
            </div>
          )}
          {loading ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono-numbers">
              <span className="text-emerald-400">{stats?.totalVideosAdded ?? 0} agreg.</span>
              <span>·</span>
              <span className="text-amber-400">{stats?.totalVideosFiltered ?? 0} filtr.</span>
              {(stats?.totalVideosErrored ?? 0) > 0 && (
                <>
                  <span>·</span>
                  <span className="text-rose-400">{stats?.totalVideosErrored} err.</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FILA 2: Infraestructura y Estado Operativo (Cuadrícula Centrada) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Canales Monitoreados */}
        <div className="glass-card-interactive rounded-2xl p-6 border border-white/[0.08] flex flex-col items-center justify-center text-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Radio className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Canales Monitoreados
          </span>
          {loading ? (
            <Skeleton className="h-9 w-16" />
          ) : (
            <div className="text-3xl font-display font-black text-slate-100 font-mono-numbers">
              {stats?.channelsCount ?? 0}
            </div>
          )}
          {!loading && (
            <p className="text-xs text-slate-400 font-mono-numbers">
              <span className="text-emerald-400 font-medium">{stats?.activeChannelsCount ?? 0} activos</span>
              {' · '}
              <span className="text-slate-500">{stats?.inactiveChannelsCount ?? 0} inactivos</span>
            </p>
          )}
        </div>

        {/* Listas de Reproducción */}
        <div className="glass-card-interactive rounded-2xl p-6 border border-white/[0.08] flex flex-col items-center justify-center text-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
            <ListVideo className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Listas Sincronizadas
          </span>
          {loading ? (
            <Skeleton className="h-9 w-16" />
          ) : (
            <div className="text-3xl font-display font-black text-slate-100 font-mono-numbers">
              {stats?.playlistsCount ?? 0}
            </div>
          )}
          {!loading && (
            <p className="text-xs text-slate-400 font-mono-numbers">
              <span className="text-pink-300 font-medium">{stats?.playlistsWithRulesCount ?? 0} con reglas</span>
              {' · '}
              <span className="text-slate-500">{stats?.playlistsWithoutRulesCount ?? 0} sin reglas</span>
            </p>
          )}
        </div>

        {/* Reglas de Organización */}
        <div className="glass-card-interactive rounded-2xl p-6 border border-white/[0.08] flex flex-col items-center justify-center text-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <GitBranch className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Reglas Configuradas
          </span>
          {loading ? (
            <Skeleton className="h-9 w-16" />
          ) : (
            <div className="text-3xl font-display font-black text-slate-100 font-mono-numbers">
              {stats?.activeRulesCount ?? 0}
              <span className="text-base font-normal text-slate-500"> / {stats?.totalRulesCount ?? 0}</span>
            </div>
          )}
          {!loading && (
            <p className="text-xs text-slate-400 font-mono-numbers">
              <span className="text-amber-300 font-medium">{stats?.shortsEnabledRulesCount ?? 0} incluyen Shorts</span>
            </p>
          )}
        </div>

        {/* Última Sincronización y Cuota Diaria */}
        <div className="glass-card-interactive rounded-2xl p-6 border border-white/[0.08] flex flex-col items-center justify-center text-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <Clock className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Última Sincronización
          </span>
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-xl font-display font-bold text-slate-100">
              {formatLastSync(stats?.lastSync || null)}
            </div>
          )}
          {!loading && (
            <p className="text-xs text-slate-400 font-mono-numbers">
              <span>{stats?.totalSyncsCount ?? 0} ejecuciones</span>
              {' · '}
              <span className="text-teal-300">Cuota hoy: {stats?.quotaUsedToday ?? 0} pts ({quotaPercentage}%)</span>
            </p>
          )}
        </div>
      </div>

      {/* FILA 3: Paneles Analíticos en Cuadrícula (Desglose de Filtros, Top Canales, Top Listas) */}
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-3">
        {/* Panel 1: Desglose de Evaluación y Filtros */}
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08] flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Gauge className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-slate-100 text-base">
                  Desglose de Procesamiento
                </h2>
                <p className="text-xs text-slate-400">Distribución histórica de videos evaluados</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 my-auto">
              <div className="p-3.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mb-1" />
                <span className="text-2xl font-display font-black text-emerald-300 font-mono-numbers">
                  {stats?.totalVideosAdded ?? 0}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">Agregados a listas</span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 flex flex-col items-center justify-center text-center">
                <Filter className="h-4 w-4 text-amber-400 mb-1" />
                <span className="text-2xl font-display font-black text-amber-300 font-mono-numbers">
                  {stats?.filteredByShorts ?? 0}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">Omitidos (Shorts)</span>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/20 flex flex-col items-center justify-center text-center">
                <Zap className="h-4 w-4 text-indigo-400 mb-1" />
                <span className="text-2xl font-display font-black text-indigo-300 font-mono-numbers">
                  {stats?.filteredByTitle ?? 0}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">Omitidos por título</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-white/[0.06] flex flex-col items-center justify-center text-center">
                <AlertCircle className="h-4 w-4 text-slate-400 mb-1" />
                <span className="text-2xl font-display font-black text-slate-200 font-mono-numbers">
                  {(stats?.filteredByDuplicate ?? 0) + (stats?.totalVideosErrored ?? 0)}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">Duplicados / Otros</span>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>Sincronizaciones: <strong className="text-slate-200 font-mono-numbers">{stats?.autoSyncsCount ?? 0} auto</strong> · <strong className="text-slate-200 font-mono-numbers">{stats?.manualSyncsCount ?? 0} manual</strong></span>
            <a href="/dashboard/logs" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Ver registros &rarr;
            </a>
          </div>
        </div>

        {/* Panel 2: Top Canales */}
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Radio className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-slate-100 text-base">
                  Canales con Mayor Aporte
                </h2>
                <p className="text-xs text-slate-400">Canales que más videos sumaron a tus listas</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 py-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-xl" />
              ))}
            </div>
          ) : !stats?.topChannels || stats.topChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8 my-auto">
              <Radio className="h-7 w-7 text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">No hay canales registrados todavía.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 my-auto">
              {stats.topChannels.map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {ch.channelThumbnail ? (
                      <img
                        src={ch.channelThumbnail}
                        alt={ch.channelName}
                        className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-xs font-bold text-slate-300">
                        {ch.channelName.substring(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate" title={ch.channelName}>
                        {ch.channelName}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono-numbers">
                        {ch.processedCount} evaluados
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[11px] font-mono-numbers shrink-0">
                    +{ch.addedCount} agreg.
                  </Badge>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>Total: <strong className="text-slate-200 font-mono-numbers">{stats?.channelsCount ?? 0}</strong> canales</span>
            <a href="/dashboard/channels" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Administrar canales &rarr;
            </a>
          </div>
        </div>

        {/* Panel 3: Top Listas de Reproducción */}
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
                <ListVideo className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-slate-100 text-base">
                  Listas Más Activas
                </h2>
                <p className="text-xs text-slate-400">Listas de destino con más videos acumulados</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 py-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-xl" />
              ))}
            </div>
          ) : !stats?.topPlaylists || stats.topPlaylists.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8 my-auto">
              <ListVideo className="h-7 w-7 text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">No hay listas sincronizadas todavía.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 my-auto">
              {stats.topPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-slate-200 truncate" title={pl.playlistName}>
                        {pl.playlistName}
                      </p>
                      <a
                        href={`https://www.youtube.com/playlist?list=${pl.playlistId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-pink-400 transition-colors shrink-0"
                        title="Abrir en YouTube"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono-numbers">
                      {pl.rulesCount} {pl.rulesCount === 1 ? 'regla asignada' : 'reglas asignadas'}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-pink-500/30 bg-pink-500/10 text-pink-300 text-[11px] font-mono-numbers shrink-0">
                    {pl.videosAddedCount} {pl.videosAddedCount === 1 ? 'video' : 'videos'}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>Total: <strong className="text-slate-200 font-mono-numbers">{stats?.playlistsCount ?? 0}</strong> listas</span>
            <a href="/dashboard/playlists" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Ver todas las listas &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

