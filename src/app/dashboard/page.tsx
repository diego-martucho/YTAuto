'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
  ExternalLink,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useFitPageSize } from '@/hooks/use-fit-page-size'

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

type Accent = 'emerald' | 'indigo' | 'violet' | 'cyan' | 'blue' | 'pink' | 'amber' | 'teal'

const accentClasses: Record<Accent, { box: string; text: string }> = {
  emerald: { box: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', text: 'text-emerald-400' },
  indigo: { box: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400', text: 'text-indigo-400' },
  violet: { box: 'bg-violet-500/10 border-violet-500/20 text-violet-400', text: 'text-violet-400' },
  cyan: { box: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400', text: 'text-cyan-400' },
  blue: { box: 'bg-blue-500/10 border-blue-500/20 text-blue-400', text: 'text-blue-400' },
  pink: { box: 'bg-pink-500/10 border-pink-500/20 text-pink-400', text: 'text-pink-400' },
  amber: { box: 'bg-amber-500/10 border-amber-500/20 text-amber-400', text: 'text-amber-400' },
  teal: { box: 'bg-teal-500/10 border-teal-500/20 text-teal-400', text: 'text-teal-400' },
}

interface StatCardProps {
  icon: LucideIcon
  accent: Accent
  label: string
  value: React.ReactNode
  suffix?: string
  sub: React.ReactNode
  loading: boolean
  valueClassName?: string
}

function StatCard({ icon: Icon, accent, label, value, suffix, sub, loading, valueClassName }: StatCardProps) {
  const colors = accentClasses[accent]
  return (
    <div className="glass-card-interactive rounded-2xl p-3.5 lg:p-4 border border-white/[0.08] flex items-start gap-3 min-w-0">
      <div className={`hidden lg:flex p-2.5 rounded-xl border shrink-0 ${colors.box}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Icon className={`lg:hidden h-3.5 w-3.5 shrink-0 ${colors.text}`} />
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">
            {label}
          </span>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-16 mt-1" />
        ) : (
          <div
            className={`font-display font-black text-slate-100 font-mono-numbers leading-tight mt-0.5 truncate ${
              valueClassName ?? 'text-xl sm:text-2xl'
            }`}
          >
            {value}
            {suffix && <span className="text-xs font-normal text-slate-400 ml-1">{suffix}</span>}
          </div>
        )}
        {loading ? (
          <Skeleton className="h-3.5 w-24 mt-1.5" />
        ) : (
          <div className="text-[11px] text-slate-400 mt-0.5 truncate font-mono-numbers">{sub}</div>
        )}
      </div>
    </div>
  )
}

function PanelHeader({ icon: Icon, accent, title, subtitle }: { icon: LucideIcon; accent: Accent; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-3 shrink-0">
      <div className={`p-2 rounded-xl border ${accentClasses[accent].box}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <h2 className="font-display font-bold text-slate-100 text-sm sm:text-base truncate">{title}</h2>
        <p className="text-[11px] sm:text-xs text-slate-400 truncate">{subtitle}</p>
      </div>
    </div>
  )
}

const TOP_ROW_HEIGHT = 46
const TOP_ROW_GAP = 6

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  const { measure: measureChannels, pageSize: channelsFitSize } = useFitPageSize({ rowHeight: TOP_ROW_HEIGHT, gap: TOP_ROW_GAP, minRows: 2, mobilePageSize: 5 })
  const { measure: measurePlaylists, pageSize: playlistsFitSize } = useFitPageSize({ rowHeight: TOP_ROW_HEIGHT, gap: TOP_ROW_GAP, minRows: 2, mobilePageSize: 5 })

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

  const visibleChannels = (stats?.topChannels ?? []).slice(0, channelsFitSize ?? 4)
  const visiblePlaylists = (stats?.topPlaylists ?? []).slice(0, playlistsFitSize ?? 4)

  return (
    <div className="flex flex-col gap-4 md:h-full md:min-h-0 animate-pop-in">
      {/* Header con botón de Sincronización Manual */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4 shrink-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-100">
            Panel de Control
          </h1>
          <p className="text-slate-400 text-sm mt-0.5 sm:truncate">
            Estadísticas generales, promedios diarios y rendimiento de tu automatización de YouTube.
          </p>
        </div>

        <Button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-600/30 cursor-pointer w-full sm:w-auto shrink-0"
        >
          {isSyncing ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin text-indigo-300" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-1 h-4 w-4" />
              Sincronizar ahora
            </>
          )}
        </Button>
      </div>

      {/* Métricas principales: 8 tarjetas compactas */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 shrink-0">
        <StatCard
          icon={TrendingUp}
          accent="emerald"
          label="Agregados por día"
          value={stats?.avgDailyAdded ?? 0}
          suffix="/ día"
          loading={loading}
          sub={
            <>
              <span className="text-emerald-300">+{stats?.videosAddedToday ?? 0} hoy</span>
              <span className="text-slate-500">
                {' '}· {stats?.activeDays ?? 1} {stats?.activeDays === 1 ? 'día activo' : 'días activos'}
              </span>
            </>
          }
        />
        <StatCard
          icon={Activity}
          accent="indigo"
          label="Procesados por día"
          value={stats?.avgDailyProcessed ?? 0}
          suffix="/ día"
          loading={loading}
          sub={<span className="text-indigo-300">{stats?.videosProcessedToday ?? 0} evaluados hoy</span>}
        />
        <StatCard
          icon={Video}
          accent="violet"
          label="Total agregados"
          value={stats?.totalVideosAdded ?? 0}
          loading={loading}
          sub={
            <>
              Aceptación: <strong className="text-violet-300">{stats?.acceptanceRate ?? 0}%</strong>
            </>
          }
        />
        <StatCard
          icon={Filter}
          accent="cyan"
          label="Total procesados"
          value={stats?.totalVideosProcessed ?? 0}
          loading={loading}
          sub={
            <>
              <span className="text-emerald-400">{stats?.totalVideosAdded ?? 0} agreg.</span>
              {' · '}
              <span className="text-amber-400">{stats?.totalVideosFiltered ?? 0} filtr.</span>
              {(stats?.totalVideosErrored ?? 0) > 0 && (
                <>
                  {' · '}
                  <span className="text-rose-400">{stats?.totalVideosErrored} err.</span>
                </>
              )}
            </>
          }
        />
        <StatCard
          icon={Radio}
          accent="blue"
          label="Canales"
          value={stats?.channelsCount ?? 0}
          loading={loading}
          sub={
            <>
              <span className="text-emerald-400">{stats?.activeChannelsCount ?? 0} activos</span>
              <span className="text-slate-500"> · {stats?.inactiveChannelsCount ?? 0} inactivos</span>
            </>
          }
        />
        <StatCard
          icon={ListVideo}
          accent="pink"
          label="Listas"
          value={stats?.playlistsCount ?? 0}
          loading={loading}
          sub={
            <>
              <span className="text-pink-300">{stats?.playlistsWithRulesCount ?? 0} con reglas</span>
              <span className="text-slate-500"> · {stats?.playlistsWithoutRulesCount ?? 0} sin reglas</span>
            </>
          }
        />
        <StatCard
          icon={GitBranch}
          accent="amber"
          label="Reglas activas"
          value={
            <>
              {stats?.activeRulesCount ?? 0}
              <span className="text-sm font-normal text-slate-500"> / {stats?.totalRulesCount ?? 0}</span>
            </>
          }
          loading={loading}
          sub={<span className="text-amber-300">{stats?.shortsEnabledRulesCount ?? 0} incluyen Shorts</span>}
        />
        <StatCard
          icon={Clock}
          accent="teal"
          label="Última sincronización"
          value={formatLastSync(stats?.lastSync || null)}
          valueClassName="text-base sm:text-lg lg:text-xl font-bold py-0.5"
          loading={loading}
          sub={
            <>
              <span>{stats?.totalSyncsCount ?? 0} ejec.</span>
              <span className="text-teal-300"> · Cuota hoy {stats?.quotaUsedToday ?? 0} pts ({quotaPercentage}%)</span>
            </>
          }
        />
      </div>

      {/* Paneles analíticos: ocupan el alto restante en escritorio */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 md:flex-1 md:min-h-0">
        {/* Panel 1: Desglose de Evaluación y Filtros */}
        <div className="glass-card rounded-2xl p-4 border border-white/[0.08] flex flex-col gap-3 min-h-0">
          <PanelHeader
            icon={Gauge}
            accent="indigo"
            title="Desglose de Procesamiento"
            subtitle="Distribución histórica de videos evaluados"
          />

          <div className="grid grid-cols-2 auto-rows-fr gap-2.5 flex-1 min-h-0">
            {[
              { icon: CheckCircle2, value: stats?.totalVideosAdded ?? 0, label: 'Agregados a listas', box: 'bg-emerald-500/[0.06] border-emerald-500/20', ic: 'text-emerald-400', tx: 'text-emerald-300' },
              { icon: Filter, value: stats?.filteredByShorts ?? 0, label: 'Omitidos (Shorts)', box: 'bg-amber-500/[0.06] border-amber-500/20', ic: 'text-amber-400', tx: 'text-amber-300' },
              { icon: Zap, value: stats?.filteredByTitle ?? 0, label: 'Omitidos por título', box: 'bg-indigo-500/[0.06] border-indigo-500/20', ic: 'text-indigo-400', tx: 'text-indigo-300' },
              { icon: AlertCircle, value: (stats?.filteredByDuplicate ?? 0) + (stats?.totalVideosErrored ?? 0), label: 'Duplicados / Otros', box: 'bg-slate-800/40 border-white/[0.06]', ic: 'text-slate-400', tx: 'text-slate-200' },
            ].map((tile) =>
              loading ? (
                <Skeleton key={tile.label} className="w-full h-full min-h-16 rounded-xl" />
              ) : (
                <div
                  key={tile.label}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center min-h-16 ${tile.box}`}
                >
                  <tile.icon className={`h-4 w-4 mb-0.5 ${tile.ic}`} />
                  <span className={`text-xl lg:text-2xl font-display font-black font-mono-numbers leading-tight ${tile.tx}`}>
                    {tile.value}
                  </span>
                  <span className="text-[10px] lg:text-[11px] text-slate-400 leading-tight">{tile.label}</span>
                </div>
              )
            )}
          </div>

          <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
            <span className="truncate">
              Sinc.: <strong className="text-slate-200 font-mono-numbers">{stats?.autoSyncsCount ?? 0} auto</strong> ·{' '}
              <strong className="text-slate-200 font-mono-numbers">{stats?.manualSyncsCount ?? 0} manual</strong>
            </span>
            <Link href="/dashboard/logs" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors shrink-0">
              Registros &rarr;
            </Link>
          </div>
        </div>

        {/* Panel 2: Top Canales */}
        <div className="glass-card rounded-2xl p-4 border border-white/[0.08] flex flex-col gap-3 min-h-0">
          <PanelHeader
            icon={Radio}
            accent="blue"
            title="Canales con Mayor Aporte"
            subtitle="Canales que más videos sumaron a tus listas"
          />

          <div ref={measureChannels} className="md:flex-1 md:min-h-0 overflow-hidden">
            {loading ? (
              <div className="flex flex-col gap-1.5">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-[46px] w-full rounded-xl" />
                ))}
              </div>
            ) : visibleChannels.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-6 h-full">
                <Radio className="h-7 w-7 text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">No hay canales registrados todavía.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {visibleChannels.map((ch) => (
                  <div
                    key={ch.id}
                    className="h-[46px] flex items-center justify-between gap-3 px-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {ch.channelThumbnail ? (
                        <img
                          src={ch.channelThumbnail}
                          alt={ch.channelName}
                          className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-xs font-bold text-slate-300">
                          {ch.channelName.substring(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate" title={ch.channelName}>
                          {ch.channelName}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono-numbers">{ch.processedCount} evaluados</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[11px] font-mono-numbers shrink-0">
                      +{ch.addedCount}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
            <span>
              Total: <strong className="text-slate-200 font-mono-numbers">{stats?.channelsCount ?? 0}</strong> canales
            </span>
            <Link href="/dashboard/channels" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors shrink-0">
              Administrar &rarr;
            </Link>
          </div>
        </div>

        {/* Panel 3: Top Listas de Reproducción */}
        <div className="glass-card rounded-2xl p-4 border border-white/[0.08] flex flex-col gap-3 min-h-0">
          <PanelHeader
            icon={ListVideo}
            accent="pink"
            title="Listas Más Activas"
            subtitle="Listas de destino con más videos acumulados"
          />

          <div ref={measurePlaylists} className="md:flex-1 md:min-h-0 overflow-hidden">
            {loading ? (
              <div className="flex flex-col gap-1.5">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-[46px] w-full rounded-xl" />
                ))}
              </div>
            ) : visiblePlaylists.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-6 h-full">
                <ListVideo className="h-7 w-7 text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">No hay listas sincronizadas todavía.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {visiblePlaylists.map((pl) => (
                  <div
                    key={pl.id}
                    className="h-[46px] flex items-center justify-between gap-3 px-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]"
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
          </div>

          <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
            <span>
              Total: <strong className="text-slate-200 font-mono-numbers">{stats?.playlistsCount ?? 0}</strong> listas
            </span>
            <Link href="/dashboard/playlists" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors shrink-0">
              Ver todas &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
