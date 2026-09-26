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
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  // Custom Delete Modal state
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Search & Sort states
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc'>('name_asc')

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
    } catch (error) {
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
        body: JSON.stringify({ action: 'sync' })
      })

      if (!res.ok) throw new Error('Error al sincronizar listas')
      
      toast.success('Listas sincronizadas correctamente')
      fetchPlaylists()
    } catch (error) {
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
        body: JSON.stringify({ id: playlistToDelete.id })
      })
      if (!res.ok) throw new Error('Error al eliminar la lista')
      setPlaylists(playlists.filter(p => p.id !== playlistToDelete.id))
      toast.success(`Lista "${playlistToDelete.playlistName}" eliminada`)
      setPlaylistToDelete(null)
    } catch (error) {
      toast.error('Error al eliminar la lista de reproducción')
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter and sort playlists
  const filteredPlaylists = useMemo(() => {
    return playlists
      .filter((p) => {
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
        return 0
      })
  }, [playlists, searchQuery, sortBy])

  const hasActiveFilters = searchQuery.trim() !== '' || sortBy !== 'name_asc'

  const clearFilters = () => {
    setSearchQuery('')
    setSortBy('name_asc')
  }

  return (
    <div className="space-y-8 animate-pop-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-display text-slate-100">Tus Listas de Reproducción</h1>
          <p className="text-slate-400 mt-1">Gestiona las listas de YouTube donde se organizarán los videos automáticamente.</p>
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

      {/* Toolbar: Buscador y Orden */}
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

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 shrink-0">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <Select value={sortBy} onValueChange={(val) => val && setSortBy(val as 'name_asc' | 'name_desc')}>
                <SelectTrigger className="bg-black/30 border-white/[0.08] text-slate-200 text-xs h-9 min-w-36">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1523] border-white/[0.08] text-slate-200">
                  <SelectItem value="name_asc">Nombre (A - Z)</SelectItem>
                  <SelectItem value="name_desc">Nombre (Z - A)</SelectItem>
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
            Mostrando <strong className="text-slate-200">{filteredPlaylists.length}</strong> de <strong className="text-slate-200">{playlists.length}</strong> {playlists.length === 1 ? 'lista' : 'listas'}
          </span>
          {hasActiveFilters && (
            <span className="text-violet-400">Filtros aplicados</span>
          )}
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
          <p className="text-slate-400 mt-1 max-w-sm">No tienes listas sincronizadas. Haz clic en "Sincronizar" para importar tus listas de YouTube.</p>
        </div>
      ) : filteredPlaylists.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-white/[0.01]">
          <Search className="h-8 w-8 text-slate-500 mb-3" />
          <h3 className="text-base font-semibold text-slate-200 font-display">Sin coincidencias</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-sm">
            No se encontró ninguna lista que coincida con tu búsqueda.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="mt-4 border-white/[0.1] bg-white/[0.04] text-slate-300 hover:text-white"
          >
            Restablecer búsqueda
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlaylists.map((playlist) => (
            <div key={playlist.id} className="glass-card-interactive rounded-2xl p-5 border border-white/[0.08] flex flex-col gap-3 transition-all hover:bg-white/[0.04]">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-100 line-clamp-2 leading-tight text-sm" title={playlist.playlistName}>
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

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/[0.04]">
                <Badge variant="secondary" className="bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 font-mono-numbers text-[11px]">
                  {playlist.videosAddedCount ?? 0} {playlist.videosAddedCount === 1 ? 'video añadido' : 'videos añadidos'}
                </Badge>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setPlaylistToDelete(playlist)}
                  className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 h-8 w-8 cursor-pointer"
                  title="Eliminar de YTAuto"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmación para eliminar lista con estilos de la app */}
      <ConfirmDialog
        open={!!playlistToDelete}
        onOpenChange={(open) => !open && setPlaylistToDelete(null)}
        title="¿Eliminar lista de reproducción?"
        description={
          <>
            ¿Deseas eliminar la lista <strong className="text-slate-200 font-semibold">{playlistToDelete?.playlistName}</strong> de YTAuto?
            <br />
            <span className="text-xs text-slate-400 mt-1 block">
              Nota: Esto solo elimina la referencia en la base de datos de YTAuto; tu lista original en YouTube no será modificada ni borrada.
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
