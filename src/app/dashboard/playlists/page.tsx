'use client'

import { useState, useEffect, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  RefreshCw,
  ListMusic,
  Trash2,
  Loader2,
  Search,
  X,
  ArrowUpDown,
  ExternalLink,
  SlidersHorizontal,
  GitBranch,
  Globe,
  Lock,
  Link2,
  Radio,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { PaginationBar } from '@/components/ui/pagination-bar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useFitPageSize, usePagination } from '@/hooks/use-fit-page-size'
import { normalizeText } from '@/lib/utils'

interface SourceChannel {
  id: string
  name: string
  thumbnail: string | null
  active: boolean
}

interface Playlist {
  id: string
  playlistId: string
  playlistName: string
  videosAddedCount?: number
  rulesCount?: number
  activeRulesCount?: number
  description?: string | null
  thumbnailUrl?: string | null
  itemCount?: number | null
  privacyStatus?: string | null
  lastSyncedAt?: string | null
  lastAddedAt?: string | null
  addedLast7Days?: number
  sourceChannels?: SourceChannel[]
}

type SortKey = 'name_asc' | 'name_desc' | 'rules_desc' | 'videos_desc' | 'recent_activity' | 'items_desc'

const ROW_HEIGHT = 88
const ROW_GAP = 10

const privacyInfo: Record<string, { label: string; icon: typeof Globe; className: string }> = {
  public: { label: 'Pública', icon: Globe, className: 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10' },
  unlisted: { label: 'No listada', icon: Link2, className: 'text-sky-300 border-sky-500/25 bg-sky-500/10' },
  private: { label: 'Privada', icon: Lock, className: 'text-slate-300 border-white/10 bg-white/[0.04]' },
}

function relativeTime(date: string | null | undefined) {
  if (!date) return null
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

function Stat({
  label,
  value,
  hint,
  className = '',
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col min-w-0 ${className}`}>
      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 truncate">{label}</span>
      <span className="text-sm font-display font-bold text-slate-100 font-mono-numbers leading-tight truncate">{value}</span>
      {hint && <span className="text-[10px] text-slate-500 truncate">{hint}</span>}
    </div>
  )
}

function SourceChannels({ channels }: { channels: SourceChannel[] }) {
  if (channels.length === 0) {
    return <span className="text-[11px] text-slate-500 italic">Ningún canal la alimenta todavía</span>
  }
  const shown = channels.slice(0, 4)
  const names = channels.map((c) => c.name).join(', ')
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="flex items-center gap-2 min-w-0 cursor-default">
            <div className="flex -space-x-1.5 shrink-0">
              {shown.map((c) =>
                c.thumbnail ? (
                  <img
                    key={c.id}
                    src={c.thumbnail}
                    alt={c.name}
                    className={`w-5 h-5 rounded-full border border-[#0f1523] object-cover ${c.active ? '' : 'opacity-40 grayscale'}`}
                  />
                ) : (
                  <div
                    key={c.id}
                    className={`w-5 h-5 rounded-full border border-[#0f1523] bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-300 ${c.active ? '' : 'opacity-40'}`}
                  >
                    {c.name.substring(0, 1).toUpperCase()}
                  </div>
                )
              )}
            </div>
            <span className="text-[11px] text-slate-400 truncate">
              {channels.length === 1 ? channels[0].name : `${channels[0].name} y ${channels.length - 1} más`}
            </span>
          </div>
        }
      />
      <TooltipContent side="bottom" className="max-w-sm">
        Canales que alimentan esta lista: {names}
      </TooltipContent>
    </Tooltip>
  )
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  // Custom Delete Modal state
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Search, Filter & Sort states
  const [searchQuery, setSearchQuery] = useState('')
  const [rulesFilter, setRulesFilter] = useState<'all' | 'with_rules' | 'without_rules'>('all')
  const [sortBy, setSortBy] = useState<SortKey>('name_asc')

  // Paginado adaptable al alto disponible (una lista por fila)
  const { measure: measureList, pageSize: fitPageSize } = useFitPageSize({
    rowHeight: ROW_HEIGHT,
    gap: ROW_GAP,
    mobilePageSize: 8,
  })

  useEffect(() => {
    fetchPlaylists()
  }, [])

  const fetchPlaylists = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/playlists')
      if (!res.ok) throw new Error('Error al cargar listas de reproducción')
      const data = await res.json()
      setPlaylists(data)
    } catch {
      toast.error('Error al cargar las listas de reproducción')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      setIsSyncing(true)
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      })

      if (!res.ok) throw new Error('Error al sincronizar listas')

      const data: {
        playlists: Playlist[]
        added: number
        removed: Array<{ playlistName: string; rulesCount: number }>
      } = await res.json()
      setPlaylists(data.playlists)

      const parts = ['Listas sincronizadas correctamente']
      if (data.added > 0) parts.push(`${data.added} ${data.added === 1 ? 'nueva' : 'nuevas'}`)
      toast.success(parts.join(' · '))

      if (data.removed.length > 0) {
        const lostRules = data.removed.reduce((acc, r) => acc + r.rulesCount, 0)
        toast.warning(
          `${data.removed.length} ${data.removed.length === 1 ? 'lista ya no existe' : 'listas ya no existen'} en tu YouTube y se quitaron de YTAuto` +
            (lostRules > 0 ? ` junto con ${lostRules} ${lostRules === 1 ? 'regla' : 'reglas'}` : '') +
            `: ${data.removed.map((r) => r.playlistName).join(', ')}`,
          { duration: 10000 }
        )
      }
    } catch {
      toast.error('No se pudieron sincronizar las listas')
    } finally {
      setIsSyncing(false)
    }
  }

  const confirmDeletePlaylist = async () => {
    if (!playlistToDelete) return
    try {
      setIsDeleting(true)
      const res = await fetch(`/api/playlists`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: playlistToDelete.id }),
      })
      if (!res.ok) throw new Error('Error al eliminar la lista')
      setPlaylists(playlists.filter((p) => p.id !== playlistToDelete.id))
      toast.success(`Lista "${playlistToDelete.playlistName}" eliminada`)
      setPlaylistToDelete(null)
    } catch {
      toast.error('Error al eliminar la lista de reproducción')
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter and sort playlists
  const filteredPlaylists = useMemo(() => {
    return playlists
      .filter((p) => {
        const count = p.rulesCount ?? 0
        if (rulesFilter === 'with_rules' && count === 0) return false
        if (rulesFilter === 'without_rules' && count > 0) return false

        if (searchQuery.trim()) {
          const normQuery = normalizeText(searchQuery)
          const normName = normalizeText(p.playlistName)
          const normId = normalizeText(p.playlistId)
          const normChannels = normalizeText((p.sourceChannels ?? []).map((c) => c.name).join(' '))
          return normName.includes(normQuery) || normId.includes(normQuery) || normChannels.includes(normQuery)
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') {
          return a.playlistName.localeCompare(b.playlistName, 'es', { sensitivity: 'base' })
        }
        if (sortBy === 'name_desc') {
          return b.playlistName.localeCompare(a.playlistName, 'es', { sensitivity: 'base' })
        }
        if (sortBy === 'rules_desc') {
          return (b.rulesCount ?? 0) - (a.rulesCount ?? 0)
        }
        if (sortBy === 'videos_desc') {
          return (b.videosAddedCount ?? 0) - (a.videosAddedCount ?? 0)
        }
        if (sortBy === 'items_desc') {
          return (b.itemCount ?? 0) - (a.itemCount ?? 0)
        }
        if (sortBy === 'recent_activity') {
          const ta = a.lastAddedAt ? new Date(a.lastAddedAt).getTime() : 0
          const tb = b.lastAddedAt ? new Date(b.lastAddedAt).getTime() : 0
          return tb - ta
        }
        return 0
      })
  }, [playlists, searchQuery, rulesFilter, sortBy])

  const pagination = usePagination(filteredPlaylists, fitPageSize)
  const { setPage } = pagination

  // Volver a la primera página al cambiar búsqueda, filtros u orden
  useEffect(() => {
    setPage(1)
  }, [searchQuery, rulesFilter, sortBy, setPage])

  const hasActiveFilters =
    searchQuery.trim() !== '' || rulesFilter !== 'all' || sortBy !== 'name_asc'

  const clearFilters = () => {
    setSearchQuery('')
    setRulesFilter('all')
    setSortBy('name_asc')
  }

  // Si las listas aún no tienen metadatos de YouTube (se cargan al sincronizar)
  const missingMetadata = !loading && playlists.length > 0 && playlists.every((p) => !p.lastSyncedAt)

  return (
    <div className="flex flex-col gap-4 md:h-full md:min-h-0 animate-pop-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-100">Tus Listas de Reproducción</h1>
          <p className="text-slate-400 text-sm mt-0.5 sm:truncate">
            Gestiona las listas de YouTube donde se organizarán los videos automáticamente.
          </p>
        </div>

        <Button
          onClick={handleSync}
          disabled={isSyncing}
          className="bg-violet-600 hover:bg-violet-700 text-white border-none shadow-sm shadow-violet-600/30 font-semibold cursor-pointer shrink-0 w-full sm:w-auto"
        >
          {isSyncing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
          Sincronizar desde YouTube
        </Button>
      </div>

      {missingMetadata && (
        <div className="shrink-0 px-3.5 py-2.5 rounded-xl border border-violet-500/25 bg-violet-500/[0.07] text-xs text-violet-200 flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 text-violet-400 shrink-0" />
          Tocá &ldquo;Sincronizar desde YouTube&rdquo; una vez para cargar miniaturas, privacidad y cantidad de videos de cada lista.
        </div>
      )}

      {/* Toolbar: Buscador, Filtro por Reglas y Orden */}
      {playlists.length > 0 && (
        <div className="glass-card p-2.5 rounded-2xl border border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Buscar por nombre, ID o canal que la alimenta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-9 bg-black/30 border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus-visible:ring-violet-500/40 text-sm h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Filtro por reglas asignadas */}
            <div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-0">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <Select
                value={rulesFilter}
                onValueChange={(val) => val && setRulesFilter(val as 'all' | 'with_rules' | 'without_rules')}
              >
                <SelectTrigger className="bg-black/30 border-white/[0.08] text-slate-200 text-xs h-9 w-full sm:w-auto sm:min-w-40">
                  <SelectValue placeholder="Filtrar por reglas" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1523] border-white/[0.08] text-slate-200">
                  <SelectItem value="all">Todas las listas</SelectItem>
                  <SelectItem value="with_rules">Con reglas asignadas</SelectItem>
                  <SelectItem value="without_rules">Sin reglas asignadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Orden */}
            <div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-0">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <Select value={sortBy} onValueChange={(val) => val && setSortBy(val as SortKey)}>
                <SelectTrigger className="bg-black/30 border-white/[0.08] text-slate-200 text-xs h-9 w-full sm:w-auto sm:min-w-44">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1523] border-white/[0.08] text-slate-200">
                  <SelectItem value="name_asc">Nombre (A - Z)</SelectItem>
                  <SelectItem value="name_desc">Nombre (Z - A)</SelectItem>
                  <SelectItem value="recent_activity">Actividad reciente</SelectItem>
                  <SelectItem value="videos_desc">Más videos añadidos</SelectItem>
                  <SelectItem value="items_desc">Más videos en YouTube</SelectItem>
                  <SelectItem value="rules_desc">Más reglas asignadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-slate-400 hover:text-slate-200 h-9 px-2 shrink-0"
              >
                Limpiar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Lista: una fila por lista (el contenedor toma el alto restante en escritorio) */}
      <div ref={measureList} className="md:flex-1 md:min-h-0">
        {loading ? (
          <div className="flex flex-col gap-2.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="glass-card rounded-2xl p-3 md:h-[88px] border border-white/[0.08] flex items-center gap-4">
                <Skeleton className="w-28 h-16 rounded-lg shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-slate-700/60 bg-white/[0.01] md:h-full">
            <div className="p-4 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4">
              <ListMusic className="h-8 w-8 text-violet-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-100 font-display">No hay listas de reproducción</h3>
            <p className="text-slate-400 mt-1 max-w-sm">
              No tienes listas sincronizadas. Haz clic en &ldquo;Sincronizar desde YouTube&rdquo; para importar tus listas.
            </p>
          </div>
        ) : filteredPlaylists.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-white/[0.01] md:h-full">
            <Search className="h-8 w-8 text-slate-500 mb-3" />
            <h3 className="text-base font-semibold text-slate-200 font-display">Sin coincidencias</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-sm">
              No se encontró ninguna lista que coincida con tu búsqueda o filtro de reglas.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="mt-4 border-white/[0.1] bg-white/[0.04] text-slate-300 hover:text-white"
            >
              Restablecer filtros
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {pagination.pageItems.map((playlist) => {
              const rulesCount = playlist.rulesCount ?? 0
              const activeRules = playlist.activeRulesCount ?? 0
              const privacy = playlist.privacyStatus ? privacyInfo[playlist.privacyStatus] : null
              const ytUrl = `https://www.youtube.com/playlist?list=${playlist.playlistId}`
              const lastAdded = relativeTime(playlist.lastAddedAt)

              return (
                <div
                  key={playlist.id}
                  className="glass-card-interactive rounded-2xl p-3 md:h-[88px] border border-white/[0.08] flex flex-col md:flex-row md:items-center gap-3 md:gap-4 transition-all hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                    {/* Miniatura */}
                    <a
                      href={ytUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative w-24 h-14 md:w-28 md:h-16 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-gradient-to-br from-violet-900/40 to-indigo-900/40 group"
                      title="Abrir en YouTube"
                    >
                      {playlist.thumbnailUrl ? (
                        <img src={playlist.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ListMusic className="h-6 w-6 text-violet-400/70" />
                        </div>
                      )}
                      {playlist.itemCount != null && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-px rounded bg-black/80 text-[10px] font-semibold text-white font-mono-numbers">
                          {playlist.itemCount} {playlist.itemCount === 1 ? 'video' : 'videos'}
                        </span>
                      )}
                    </a>

                    {/* Datos principales */}
                    <div className="min-w-0 flex-1 flex flex-col gap-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-semibold text-slate-100 truncate text-sm" title={playlist.playlistName}>
                          {playlist.playlistName}
                        </h3>
                        {privacy && (
                          <span className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-px rounded-md border text-[10px] font-medium shrink-0 ${privacy.className}`}>
                            <privacy.icon className="h-2.5 w-2.5" />
                            {privacy.label}
                          </span>
                        )}
                        <a
                          href={ytUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-500 hover:text-violet-400 transition-colors shrink-0"
                          title="Abrir en YouTube"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate" title={playlist.description || undefined}>
                        {playlist.description || 'Sin descripción'}
                      </p>
                      <SourceChannels channels={playlist.sourceChannels ?? []} />
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-3 md:flex md:items-center gap-3 md:gap-5 shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-white/[0.05]">
                    <Stat
                      className="md:w-20"
                      label="Agregados"
                      value={<span className="text-violet-300">{playlist.videosAddedCount ?? 0}</span>}
                      hint={(playlist.addedLast7Days ?? 0) > 0 ? `+${playlist.addedLast7Days} en 7 días` : 'por YTAuto'}
                    />
                    <Stat
                      className="md:w-20"
                      label="Reglas"
                      value={
                        rulesCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-300">
                            <GitBranch className="h-3 w-3" />
                            {activeRules}
                            <span className="text-slate-500 font-normal text-xs">/ {rulesCount}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 font-normal text-xs">Sin reglas</span>
                        )
                      }
                      hint={rulesCount > 0 ? (activeRules === 1 ? 'activa' : 'activas') : undefined}
                    />
                    <Stat
                      className="lg:w-28 md:hidden lg:flex"
                      label="Último agregado"
                      value={<span className="text-xs font-semibold text-slate-200">{lastAdded ?? '—'}</span>}
                      hint={(playlist.sourceChannels?.length ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Radio className="h-2.5 w-2.5" />
                          {playlist.sourceChannels!.length} {playlist.sourceChannels!.length === 1 ? 'canal' : 'canales'}
                        </span>
                      ) : undefined}
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPlaylistToDelete(playlist)}
                    className="hidden md:inline-flex text-slate-400 hover:text-red-400 hover:bg-red-400/10 h-8 w-8 cursor-pointer shrink-0"
                    title="Eliminar de YTAuto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPlaylistToDelete(playlist)}
                    className="md:hidden self-end text-xs text-slate-400 hover:text-red-400 hover:bg-red-400/10 h-7 -mt-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Quitar de YTAuto
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Paginado y contador de resultados */}
      {!loading && playlists.length > 0 && filteredPlaylists.length > 0 && (
        <PaginationBar
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          accent="violet"
          summary={
            <>
              Mostrando <strong className="text-slate-200">{pagination.rangeStart}–{pagination.rangeEnd}</strong> de{' '}
              <strong className="text-slate-200">{filteredPlaylists.length}</strong>{' '}
              {filteredPlaylists.length === 1 ? 'lista' : 'listas'}
              {hasActiveFilters && <span className="text-violet-400"> · filtrado de {playlists.length}</span>}
            </>
          }
        />
      )}

      {/* Modal de confirmación para eliminar lista con estilos de la app */}
      <ConfirmDialog
        open={!!playlistToDelete}
        onOpenChange={(open) => !open && setPlaylistToDelete(null)}
        title="¿Eliminar lista de reproducción?"
        description={
          <>
            ¿Deseas eliminar la lista{' '}
            <strong className="text-slate-200 font-semibold">{playlistToDelete?.playlistName}</strong> de
            YTAuto?
            {(playlistToDelete?.rulesCount ?? 0) > 0 && (
              <span className="text-xs text-amber-300/90 mt-1 block">
                También se eliminarán sus {playlistToDelete?.rulesCount}{' '}
                {playlistToDelete?.rulesCount === 1 ? 'regla asociada' : 'reglas asociadas'}.
              </span>
            )}
            <span className="text-xs text-slate-400 mt-1 block">
              Nota: Esto solo elimina la referencia en la base de datos de YTAuto; tu lista original en YouTube
              no será modificada ni borrada.
            </span>
          </>
        }
        confirmText="Eliminar lista"
        cancelText="Cancelar"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={confirmDeletePlaylist}
      />
    </div>
  )
}
