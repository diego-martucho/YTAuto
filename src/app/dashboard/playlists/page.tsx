'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, ListMusic, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface Playlist {
  id: string
  playlistId: string
  name: string
  videoCount: number
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

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

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta lista de reproducción de la base de datos? (No se eliminará de YouTube)')) return
    try {
      const res = await fetch(`/api/playlists/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar la lista')
      setPlaylists(playlists.filter(p => p.id !== id))
      toast.success('Lista eliminada')
    } catch (error) {
      toast.error('Error al eliminar la lista de reproducción')
    }
  }

  return (
    <div className="space-y-8 animate-pop-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black font-display text-slate-100">Tus Listas de Reproducción</h1>
          <p className="text-slate-400 mt-1">Gestiona las listas de YouTube donde se organizarán los videos automáticamente.</p>
        </div>
        
        <Button 
          onClick={handleSync} 
          disabled={isSyncing}
          className="bg-violet-500 hover:bg-violet-600 text-white border-none"
        >
          {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Sincronizar desde YouTube
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((playlist) => (
            <div key={playlist.id} className="glass-card-interactive rounded-2xl p-5 border border-white/[0.08] flex flex-col gap-3 transition-all hover:bg-white/[0.04]">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-slate-100 line-clamp-2 leading-tight">{playlist.name}</h3>
              </div>

              <div className="flex items-center justify-between mt-auto pt-2">
                <Badge variant="secondary" className="bg-slate-800 text-slate-300 hover:bg-slate-700 font-mono-numbers">
                  {playlist.videoCount || 0} videos
                </Badge>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDelete(playlist.id)}
                  className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
