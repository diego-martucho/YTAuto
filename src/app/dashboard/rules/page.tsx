'use client'

import { useState, useEffect } from 'react'
import { Plus, GitBranch, Trash2, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Channel {
  id: string
  channelName: string
}

interface Playlist {
  id: string
  playlistName: string
}

interface Rule {
  id: string
  watchedChannelId: string
  targetPlaylistId: string
  filterType: 'all' | 'title_contains' | 'title_any_of'
  filterValue: string | null
  isActive: boolean
  channelName: string
  playlistName: string
}

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  
  const [formData, setFormData] = useState({
    watchedChannelId: '',
    targetPlaylistId: '',
    filterType: 'all',
    filterValue: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [rulesRes, channelsRes, playlistsRes] = await Promise.all([
        fetch('/api/rules'),
        fetch('/api/channels'),
        fetch('/api/playlists')
      ])
      
      if (!rulesRes.ok || !channelsRes.ok || !playlistsRes.ok) {
        throw new Error('Error al cargar datos')
      }

      const [rulesData, channelsData, playlistsData] = await Promise.all([
        rulesRes.json(),
        channelsRes.json(),
        playlistsRes.json()
      ])

      setRules(rulesData)
      setChannels(channelsData)
      setPlaylists(playlistsData)
    } catch (error) {
      toast.error('Error al cargar la información')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.watchedChannelId || !formData.targetPlaylistId) {
      toast.error('Debes seleccionar un canal y una lista')
      return
    }

    if (formData.filterType !== 'all' && !formData.filterValue.trim()) {
      toast.error('Debes ingresar un valor para el filtro')
      return
    }

    try {
      setIsAdding(true)
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchedChannelId: formData.watchedChannelId,
          targetPlaylistId: formData.targetPlaylistId,
          filterType: formData.filterType,
          filterValue: formData.filterType === 'all' ? null : formData.filterValue.trim()
        })
      })

      if (!res.ok) throw new Error('Error al crear regla')
      
      toast.success('Regla creada correctamente')
      setIsDialogOpen(false)
      setFormData({ watchedChannelId: '', targetPlaylistId: '', filterType: 'all', filterValue: '' })
      fetchData()
    } catch (error) {
      toast.error('No se pudo crear la regla')
    } finally {
      setIsAdding(false)
    }
  }

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/rules`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus })
      })
      if (!res.ok) throw new Error('Error al actualizar regla')
      setRules(rules.map(r => r.id === id ? { ...r, isActive: !currentStatus } : r))
      toast.success('Estado actualizado')
    } catch (error) {
      toast.error('Error al cambiar el estado de la regla')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta regla?')) return
    try {
      const res = await fetch(`/api/rules`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      if (!res.ok) throw new Error('Error al eliminar regla')
      setRules(rules.filter(r => r.id !== id))
      toast.success('Regla eliminada')
    } catch (error) {
      toast.error('Error al eliminar la regla')
    }
  }

  const getFilterBadgeLabel = (type: string) => {
    switch (type) {
      case 'all': return 'Todos los videos'
      case 'title_contains': return 'Título contiene'
      case 'title_any_of': return 'Contiene alguno de'
      default: return 'Desconocido'
    }
  }

  return (
    <div className="space-y-8 animate-pop-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black font-display text-slate-100">Reglas de Organización</h1>
          <p className="text-slate-400 mt-1">Configura cómo se envían los videos de los canales a tus listas.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white border-none">
              <Plus className="mr-2 h-4 w-4" /> Crear regla
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-white/[0.08] sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-display font-semibold text-slate-100">Crear nueva regla</DialogTitle>
              <DialogDescription className="text-slate-400">
                Define el origen, destino y condiciones para organizar los videos automáticamente.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateRule}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Canal de origen</Label>
                  <Select value={formData.watchedChannelId || ""} onValueChange={(val: string | null) => setFormData({...formData, watchedChannelId: val ?? ""})}>
                    <SelectTrigger className="bg-black/20 border-white/[0.08] text-slate-100">
                      <SelectValue placeholder="Selecciona un canal" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.channelName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-300">Lista de destino</Label>
                  <Select value={formData.targetPlaylistId || ""} onValueChange={(val: string | null) => setFormData({...formData, targetPlaylistId: val ?? ""})}>
                    <SelectTrigger className="bg-black/20 border-white/[0.08] text-slate-100">
                      <SelectValue placeholder="Selecciona una lista" />
                    </SelectTrigger>
                    <SelectContent>
                      {playlists.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.playlistName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Condición (Filtro)</Label>
                  <Select value={formData.filterType} onValueChange={(val) => setFormData({...formData, filterType: val as any})}>
                    <SelectTrigger className="bg-black/20 border-white/[0.08] text-slate-100">
                      <SelectValue placeholder="Selecciona un tipo de filtro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los videos</SelectItem>
                      <SelectItem value="title_contains">Título contiene</SelectItem>
                      <SelectItem value="title_any_of">Título contiene alguno de</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.filterType !== 'all' && (
                  <div className="space-y-2">
                    <Label htmlFor="filterValue" className="text-slate-300">Valor del filtro</Label>
                    <Input 
                      id="filterValue"
                      placeholder={formData.filterType === 'title_contains' ? 'Ej: resumen semanal' : 'Ej: resumen, noticia, informe'} 
                      value={formData.filterValue}
                      onChange={(e) => setFormData({...formData, filterValue: e.target.value})}
                      className="bg-black/20 border-white/[0.08] text-slate-100 placeholder:text-slate-600"
                    />
                    <p className="text-xs text-slate-500">
                      {formData.filterType === 'title_any_of' ? 'Separa las palabras clave por comas' : 'Texto exacto que debe contener el título'}
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isAdding || !formData.watchedChannelId || !formData.targetPlaylistId} className="bg-amber-500 hover:bg-amber-600 text-white">
                  {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Regla
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 border border-white/[0.08]">
              <div className="flex items-center gap-4 mb-3">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-6 w-1/3" />
              </div>
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-700/60 bg-white/[0.01]">
          <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
            <GitBranch className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-100 font-display">No hay reglas definidas</h3>
          <p className="text-slate-400 mt-1 max-w-sm">Crea una regla para empezar a organizar automáticamente los videos de tus canales en tus listas.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rules.map((rule) => (
            <div key={rule.id} className="glass-card-interactive rounded-2xl p-5 border border-white/[0.08] flex items-center gap-4 transition-all hover:bg-white/[0.04]">
              
              <div className="flex-1">
                <div className="flex items-center gap-3 text-slate-100 font-semibold mb-2 flex-wrap">
                  <span className="truncate max-w-[200px]" title={rule.channelName}>{rule.channelName || 'Canal desconocido'}</span>
                  <ArrowRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <span className="truncate max-w-[200px]" title={rule.playlistName}>{rule.playlistName || 'Lista desconocida'}</span>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10">
                    {getFilterBadgeLabel(rule.filterType)}
                  </Badge>
                  {rule.filterValue && (
                    <span className="text-sm text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-700/50">
                      "{rule.filterValue}"
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 ml-auto">
                <Switch 
                  checked={rule.isActive}
                  onCheckedChange={() => handleToggle(rule.id, rule.isActive)}
                  className="data-[state=checked]:bg-emerald-500"
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDelete(rule.id)}
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
