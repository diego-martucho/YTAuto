'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus } from 'lucide-react';

interface VideoResult {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
}

interface Playlist {
  id: string;
  title: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [channelId, setChannelId] = useState('');
  const [results, setResults] = useState<VideoResult[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedPlaylists, setSelectedPlaylists] = useState<Record<string, string>>({});
  const [isAdding, setIsAdding] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchPlaylists() {
      try {
        const res = await fetch('/api/playlists');
        if (res.ok) {
          const data = await res.json();
          // Assuming data returns an array or an object with an items array
          setPlaylists(Array.isArray(data) ? data : (data.items || []));
        }
      } catch (error) {
        console.error('Error fetching playlists:', error);
      }
    }
    fetchPlaylists();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setResults([]);

    try {
      const params = new URLSearchParams({ q: query });
      if (channelId) params.append('channelId', channelId);

      const res = await fetch(`/api/search?${params}`);
      if (!res.ok) throw new Error('Error al buscar videos');

      const data = await res.json();
      setResults(Array.isArray(data) ? data : (data.items || []));
    } catch (error: any) {
      toast.error(error.message || 'Ocurrió un error al buscar');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToPlaylist = async (videoId: string) => {
    const playlistId = selectedPlaylists[videoId];
    if (!playlistId) {
      toast.error('Selecciona una lista primero');
      return;
    }

    setIsAdding((prev) => ({ ...prev, [videoId]: true }));
    try {
      const res = await fetch('/api/search/add-to-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId, playlistId }),
      });

      if (!res.ok) throw new Error('Error al agregar a la lista');

      toast.success('Video agregado a la lista con éxito', { 
        className: 'bg-emerald-900 border-emerald-800 text-emerald-100' 
      });
    } catch (error: any) {
      toast.error(error.message || 'No se pudo agregar a la lista');
    } finally {
      setIsAdding((prev) => ({ ...prev, [videoId]: false }));
    }
  };

  return (
    <div className="space-y-8 animate-pop-in">
      <div>
        <h1 className="text-3xl font-black font-display text-slate-100 mb-2">
          Buscar Videos
        </h1>
        <p className="text-slate-400">
          Encuentra videos en YouTube y agrégalos a tus listas de reproducción.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 glass-card p-6 rounded-xl">
        <div className="flex-1 space-y-2">
          <label className="text-sm text-slate-400">Término de búsqueda</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Buscar por título o descripción..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 bg-slate-900/50 border-slate-800 text-slate-100"
            />
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-sm text-slate-400">Canal (Opcional)</label>
          <Input
            type="text"
            placeholder="ID del canal o nombre..."
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="bg-slate-900/50 border-slate-800 text-slate-100"
          />
        </div>
        <div className="flex items-end">
          <Button 
            type="submit" 
            disabled={isSearching || !query.trim()}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isSearching ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        {isSearching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-4 space-y-4">
                <Skeleton className="w-full aspect-video rounded-lg" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : !hasSearched ? (
          <div className="glass-card p-12 text-center rounded-xl flex flex-col items-center justify-center">
            <Search className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-400">
              Busca videos en YouTube por título o descripción
            </p>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((video) => (
              <div key={video.id} className="glass-card-interactive rounded-xl p-4 flex flex-col overflow-hidden group">
                <div className="relative aspect-video rounded-lg overflow-hidden mb-4 bg-slate-900">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                      Sin imagen
                    </div>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col">
                  <h3 className="text-slate-100 font-semibold font-display line-clamp-2 mb-2" title={video.title}>
                    {video.title}
                  </h3>
                  
                  <div className="flex items-center justify-between mt-auto mb-4">
                    <span className="text-slate-400 text-sm truncate pr-2" title={video.channelTitle}>
                      {video.channelTitle}
                    </span>
                    <span className="text-slate-500 text-xs font-mono-numbers whitespace-nowrap">
                      {new Date(video.publishedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex gap-2 items-center pt-2 border-t border-slate-800/50">
                    <div className="flex-1">
                      <Select 
                        value={selectedPlaylists[video.id] || ''} 
                        onValueChange={(val: string | null) => setSelectedPlaylists(prev => ({ ...prev, [video.id]: val ?? '' }))}
                        itemToStringLabel={(val) => (val ? playlists.find(p => p.id === val)?.title || val : "")}
                      >
                        <SelectTrigger className="bg-slate-900/50 border-slate-800 text-slate-200">
                          <SelectValue placeholder="Seleccionar lista">
                            {selectedPlaylists[video.id]
                              ? (playlists.find(p => p.id === selectedPlaylists[video.id])?.title || selectedPlaylists[video.id])
                              : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                          {playlists.length > 0 ? (
                            playlists.map(pl => (
                              <SelectItem key={pl.id} value={pl.id} className="focus:bg-slate-800 focus:text-slate-100 cursor-pointer">
                                {pl.title}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No hay listas</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      onClick={() => handleAddToPlaylist(video.id)}
                      disabled={!selectedPlaylists[video.id] || isAdding[video.id]}
                      size="icon"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                      title="Agregar a lista"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-12 text-center rounded-xl">
            <p className="text-slate-400">No se encontraron videos para tu búsqueda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
