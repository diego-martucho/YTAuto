'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Clock,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { normalizeText } from '@/lib/utils'

interface Playlist {
  id: string
  playlistId: string
  playlistName: string
  videosAddedCount?: number
  rulesCount?: number
  activeRulesCount?: number
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isCreatingWatchLater, setIsCreatingWatchLater] = useState(false)

  // Custom Delete Modal state
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Search, Filter & Sort states
  const [searchQuery, setSearchQuery] = useState('')
  const [rulesFilter, setRulesFilter] = useState<'all' | 'with_rules' | 'without_rules'>('all')
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'rules_desc' | 'videos_desc'>('name_asc')

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

      const updated = await res.json()
      setPlaylists(updated)
      toast.success('Listas sincronizadas correctamente (incluyendo "Ver más tarde")')
    } catch {
      toast.error('No se pudieron sincronizar las listas')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleCreateWatchLater = async () => {
    try {
      setIsCreatingWatchLater(true)
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: 'Ver más tarde',
          description: 'Lista Ver más tarde sincronizada automáticamente por YTAuto',
          privacyStatus: 'private',
        }),
      })

      if (!res.ok) throw new Error('Error al crear lista Ver más tarde')
      const created = await res.json()
      setPlaylists((prev) => [...prev, created])
      toast.success('Lista "Ver más tarde" creada y vinculada con tu cuenta de YouTube')
    } catch {
      toast.error('No se pudo crear la lista "Ver más tarde"')
    } finally {
      setIsCreatingWatchLater(false)
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

  const hasWatchLaterPlaylist = useMemo(() => {
    return playlists.some((p) => {
      const norm = normalizeText(p.playlistName)
      return norm === 'ver mas tarde' || norm === 'watch later'
    })
  }, [playlists])

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
          return normName.includes(normQuery) || normId.includes(normQuery)
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
        return 0
      })
  }, [playlists, searchQuery, rulesFilter, sortBy])

  const hasActiveFilters =
    searchQuery.trim() !== '' || rulesFilter !== 'all' || sortBy !== 'name_asc'

  const clearFilters = () => {
    setSearchQuery('')
    setRulesFilter('all')
    setSortBy('name_asc')
  }

  return (
    <div className="space-y-8 animate-pop-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-display text-slate-100">Tus Listas de Reproducción</h1>
          <p className="text-slate-400 mt-1">
            Gestiona las listas de YouTube donde se organizarán los videos automáticamente.
          </p>
        </div>

        <Button
          onClick={handleSync}
          disabled={isSyncing}
          className="bg-violet-600 hover:bg-violet-700 text-white border-none shadow-sm shadow-violet-600/30 font-semibold cursor-pointer shrink-0"
        >
          {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Sincronizar desde YouTube
        </Button>
      </div>

      {/* Aviso rápido si aún no está la lista "Ver más tarde" */}
      {!loading && !hasWatchLaterPlaylist && (
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-violet-500/25 bg-violet-500/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 shrink-0 mt-0.5">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                ¿Buscas la lista &ldquo;Ver más tarde&rdquo;?
              </h3>
              <p className="text-xs text-slate-300/90 mt-0.5 max-w-2xl leading-relaxed">
                Por políticas de Google, la API oficial de YouTube bloquea el acceso de apps externas a la lista del sistema <code className="text-violet-300">WL</code>. Al sincronizar o hacer clic aquí, YTAuto habilita tu lista privada <strong>&ldquo;Ver más tarde&rdquo;</strong> en YouTube para que funcione sin restricciones con tus reglas.
              </p>
            </div>
          </div>
          <Button
            onClick={handleCreateWatchLater}
            disabled={isCreatingWatchLater || isSyncing}
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white font-semibold shrink-0 cursor-pointer self-start sm:self-center"
          >
            {isCreatingWatchLater ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-3.5 w-3.5" />
            )}
            Habilitar &ldquo;Ver más tarde&rdquo;
          </Button>
        </div>
      )}

      {/* Toolbar: Buscador, Filtro por Reglas y Orden */}
      {playlists.length > 0 && (
        <div className="glass-card p-4 rounded-2xl border border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Buscar por nombre o ID de lista..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-9 bg-black/30 border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus-visible:ring-violet-500/40 text-sm h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Filtro por reglas asignadas */}
            <div className="flex items-center gap-1.5 shrink-0">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <Select
                value={rulesFilter}
                onValueChange={(val) => val && setRulesFilter(val as 'all' | 'with_rules' | 'without_rules')}
              >
                <SelectTrigger className="bg-black/30 border-white/[0.08] text-slate-200 text-xs h-9 min-w-40">
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
            <div className="flex items-center gap-1.5 shrink-0">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <Select
                value={sortBy}
                onValueChange={(val) =>
                  val && setSortBy(val as 'name_asc' | 'name_desc' | 'rules_desc' | 'videos_desc')
                }
              >
                <SelectTrigger className="bg-black/30 border-white/[0.08] text-slate-200 text-xs h-9 min-w-40">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1523] border-white/[0.08] text-slate-200">
                  <SelectItem value="name_asc">Nombre (A - Z)</SelectItem>
                  <SelectItem value="name_desc">Nombre (Z - A)</SelectItem>
                  <SelectItem value="rules_desc">Más reglas asignadas</SelectItem>
                  <SelectItem value="videos_desc">Más videos añadidos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-slate-400 hover:text-slate-200 h-9 px-2"
              >
                Limpiar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Contador de resultados */}
      {!loading && playlists.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Mostrando <strong className="text-slate-200">{filteredPlaylists.length}</strong> de{' '}
            <strong className="text-slate-200">{playlists.length}</strong>{' '}
            {playlists.length === 1 ? 'lista' : 'listas'}
          </span>
          {hasActiveFilters && <span className="text-violet-400">Filtros aplicados</span>}
        </div>
      )}

      {/* Lista de reproducción cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 border border-white/[0.08] flex flex-col gap-4">
              <Skeleton className="h-6 w-3/4" />
              <div className="flex justify-between items-center mt-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-700/60 bg-white/[0.01]">
          <div className="p-4 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4">
            <ListMusic className="h-8 w-8 text-violet-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-100 font-display">No hay listas de reproducción</h3>
          <p className="text-slate-400 mt-1 max-w-sm">
            No tienes listas sincronizadas. Haz clic en &ldquo;Sincronizar desde YouTube&rdquo; para importar tus listas.
          </p>
        </div>
      ) : filteredPlaylists.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-white/[0.01]">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlaylists.map((playlist) => {
            const rulesCount = playlist.rulesCount ?? 0
            return (
              <div
                key={playlist.id}
                className="glass-card-interactive rounded-2xl p-5 border border-white/[0.08] flex flex-col gap-3 transition-all hover:bg-white/[0.04]"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className="font-semibold text-slate-100 line-clamp-2 leading-tight text-sm"
                    title={playlist.playlistName}
                  >
                    {playlist.playlistName}
                  </h3>
                  <a
                    href={`https://www.youtube.com/playlist?list=${playlist.playlistId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-violet-400 transition-colors shrink-0"
                    title="Abrir en YouTube"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/[0.04] gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant="secondary"
                      className="bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 font-mono-numbers text-[11px]"
                    >
                      {playlist.videosAddedCount ?? 0}{' '}
                      {playlist.videosAddedCount === 1 ? 'video añadido' : 'videos añadidos'}
                    </Badge>

                    {rulesCount > 0 ? (
                      <Badge
                        variant="outline"
                        className="border-amber-500/30 bg-amber-500/10 text-amber-300 font-mono-numbers text-[11px] flex items-center gap-1"
                      >
                        <GitBranch className="h-3 w-3" />
                        {rulesCount} {rulesCount === 1 ? 'regla' : 'reglas'}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-white/[0.06] bg-white/[0.02] text-slate-500 text-[11px]"
                      >
                        Sin reglas
                      </Badge>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPlaylistToDelete(playlist)}
                    className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 h-8 w-8 cursor-pointer shrink-0"
                    title="Eliminar de YTAuto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
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
            <br />
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

