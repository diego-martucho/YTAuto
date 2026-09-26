'use client'

import { useState, useEffect } from 'react'
import {
  Radio,
  Video, ListVideo,
  GitBranch,
  Clock,
  Play,
  RefreshCw,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Filter,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardStats {
  channelsCount: number
  activeRulesCount: number
  playlistsCount: number
  videosAddedToday: number
  lastSync: string | null
  recentVideos: Array<{
    id: string
    videoId: string
    videoTitle: string
    videoUrl: string
    status: 'added' | 'filtered' | 'error'
    errorMessage: string | null
    processedAt: string
    playlistName?: string
  }>
  recentLogs: Array<{
    id: string
    channelsChecked: number
    videosAdded: number
    videosFiltered: number
    finishedAt: string
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
    } catch (error) {
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
    if (diffHours < 24) return `Hoy a las ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col gap-8 animate-pop-in">
      {/* Header con botón de Sincronización Manual */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight text-slate-100">
            Panel de Control
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Resumen en tiempo real de tu automatización de YouTube.
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

      {/* Tarjetas de Métricas Conectadas con la BD */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {/* Canales monitoreados */}
        <div className="glass-card-interactive rounded-2xl p-5 border border-white/[0.08] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Canales monitoreados
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Radio className="h-4 w-4" />
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-16" />
          ) : (
            <div className="text-3xl font-display font-black text-slate-100 font-mono-numbers">
              {stats?.channelsCount ?? 0}
            </div>
          )}
        </div>

        {/* Listas de reproducción */}
        <div className="glass-card-interactive rounded-2xl p-5 border border-white/[0.08] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Listas de repr.
            </span>
            <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
              <ListVideo className="h-4 w-4" />
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-16" />
          ) : (
            <div className="text-3xl font-display font-black text-slate-100 font-mono-numbers">
              {stats?.playlistsCount ?? 0}
            </div>
          )}
        </div>

        {/* Videos añadidos hoy */}
        <div className="glass-card-interactive rounded-2xl p-5 border border-white/[0.08] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Videos añadidos hoy
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Video className="h-4 w-4" />
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-16" />
          ) : (
            <div className="text-3xl font-display font-black text-slate-100 font-mono-numbers">
              {stats?.videosAddedToday ?? 0}
            </div>
          )}
        </div>

        {/* Reglas activas */}
        <div className="glass-card-interactive rounded-2xl p-5 border border-white/[0.08] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Reglas activas
            </span>
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <GitBranch className="h-4 w-4" />
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-16" />
          ) : (
            <div className="text-3xl font-display font-black text-slate-100 font-mono-numbers">
              {stats?.activeRulesCount ?? 0}
            </div>
          )}
        </div>

        {/* Última sincronización */}
        <div className="glass-card-interactive rounded-2xl p-5 border border-white/[0.08] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Última sincronización
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-xl font-display font-bold text-slate-200">
              {formatLastSync(stats?.lastSync || null)}
            </div>
          )}
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-display font-bold tracking-tight text-slate-100">
              Actividad reciente
            </h2>
            {stats?.recentVideos && stats.recentVideos.length > 0 && (
              <span className="hidden sm:inline-block text-xs text-slate-400 font-mono-numbers">
                Últimos videos procesados
              </span>
            )}
          </div>
          <a href="/dashboard/logs" className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Ver todos los registros &rarr;
          </a>
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-4 border border-white/[0.08] flex items-center justify-between">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : !stats?.recentVideos || stats.recentVideos.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-700/60">
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-slate-500 mb-3">
              <Clock className="h-6 w-6 opacity-60" />
            </div>
            <h3 className="font-display font-semibold text-slate-200 text-base mb-1">
              Sin actividad de sincronización
            </h3>
            <p className="text-sm text-slate-400 max-w-md">
              Aún no hay videos procesados. Haz clic en &quot;Sincronizar ahora&quot; para ejecutar manualmente la revisión de los canales y reglas activas.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {stats.recentVideos.map((video) => (
              <div
                key={video.id}
                className="glass-card-interactive rounded-xl p-4 border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.03]"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {video.status === 'added' ? (
                      <span className="p-1 rounded-full bg-emerald-500/10 text-emerald-400 inline-flex">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                    ) : video.status === 'filtered' ? (
                      <span className="p-1 rounded-full bg-slate-800 text-slate-400 inline-flex">
                        <Filter className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="p-1 rounded-full bg-rose-500/10 text-rose-400 inline-flex">
                        <AlertCircle className="h-4 w-4" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={video.videoUrl || `https://youtube.com/watch?v=${video.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-sm text-slate-200 hover:text-indigo-400 truncate flex items-center gap-1.5 transition-colors"
                        title={video.videoTitle}
                      >
                        <span className="truncate">{video.videoTitle}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                      {video.playlistName && (
                        <span>
                          Destino: <strong className="text-indigo-300 font-medium">{video.playlistName}</strong>
                        </span>
                      )}
                      {video.errorMessage && (
                        <span className="text-slate-400 italic">
                          ({video.errorMessage})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 sm:self-center shrink-0">
                  {video.status === 'added' && (
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[11px]">
                      Añadido
                    </Badge>
                  )}
                  {video.status === 'filtered' && (
                    <Badge variant="outline" className="border-slate-700 text-slate-400 bg-slate-800/50 text-[11px]">
                      Omitido / Filtrado
                    </Badge>
                  )}
                  {video.status === 'error' && (
                    <Badge variant="outline" className="border-rose-500/30 text-rose-400 bg-rose-500/10 text-[11px]">
                      Error
                    </Badge>
                  )}
                  <span className="text-xs text-slate-500 font-mono-numbers">
                    {new Date(video.processedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
