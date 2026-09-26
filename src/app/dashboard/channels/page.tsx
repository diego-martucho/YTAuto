'use client'

import { useState, useEffect } from 'react'
import { Plus, Radio, Trash2, Loader2 } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'

interface Channel {
  id: string
  channelId: string
  channelName: string
  channelUrl: string | null
  channelThumbnail: string | null
  isActive: boolean
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    fetchChannels()
  }, [])

  const fetchChannels = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/channels')
      if (!res.ok) throw new Error('Error al cargar canales')
      const data = await res.json()
      setChannels(data)
    } catch (error) {
      toast.error('Error al cargar los canales')
    } finally {
      setLoading(false)
    }
  }

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    try {
      setIsAdding(true)
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: inputValue.trim() })
      })

      if (!res.ok) throw new Error('Error al agregar canal')
      
      toast.success('Canal agregado correctamente')
      setIsDialogOpen(false)
      setInputValue('')
      fetchChannels()
    } catch (error) {
      toast.error('No se pudo agregar el canal')
    } finally {
      setIsAdding(false)
    }
  }

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/channels`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus })
      })
      if (!res.ok) throw new Error('Error al actualizar canal')
      setChannels(channels.map(c => c.id === id ? { ...c, isActive: !currentStatus } : c))
      toast.success('Estado actualizado')
    } catch (error) {
      toast.error('Error al cambiar el estado del canal')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este canal?')) return
    try {
      const res = await fetch(`/api/channels`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      if (!res.ok) throw new Error('Error al eliminar canal')
      setChannels(channels.filter(c => c.id !== id))
      toast.success('Canal eliminado')
    } catch (error) {
      toast.error('Error al eliminar el canal')
    }
  }

  return (
    <div className="space-y-8 animate-pop-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black font-display text-slate-100">Canales Monitorizados</h1>
          <p className="text-slate-400 mt-1">Administra los canales de YouTube de los cuales quieres obtener videos.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger>
            <Button className="bg-indigo-500 hover:bg-indigo-600 text-white border-none">
              <Plus className="mr-2 h-4 w-4" /> Agregar canal
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-white/[0.08] sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-display font-semibold text-slate-100">Agregar nuevo canal</DialogTitle>
              <DialogDescription className="text-slate-400">
                Ingresa la URL del canal, el @handle, o el ID directo para comenzar a monitorizarlo.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddChannel}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="channelInput" className="text-slate-300">URL o ID del Canal</Label>
                  <Input 
                    id="channelInput"
                    placeholder="Ej: youtube.com/@midudev" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="bg-black/20 border-white/[0.08] text-slate-100 placeholder:text-slate-600"
                  />
                  <p className="text-xs text-slate-500">
                    Formatos: youtube.com/@handle, youtube.com/channel/UC..., o ID directo
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isAdding || !inputValue.trim()} className="bg-indigo-500 hover:bg-indigo-600 text-white">
                  {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Agregar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 border border-white/[0.08] flex gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-700/60 bg-white/[0.01]">
          <div className="p-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <Radio className="h-8 w-8 text-indigo-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-100 font-display">No hay canales</h3>
          <p className="text-slate-400 mt-1 max-w-sm">No estás monitorizando ningún canal. Agrega uno para empezar a importar videos automáticamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((channel) => (
            <div key={channel.id} className="glass-card-interactive rounded-2xl p-5 border border-white/[0.08] flex items-center gap-4 transition-all hover:bg-white/[0.04]">
              {channel.channelThumbnail ? (
                <img src={channel.channelThumbnail} alt={channel.channelName} className="w-12 h-12 rounded-full border border-white/10" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-400">{channel.channelName.substring(0, 1).toUpperCase()}</span>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-100 truncate">{channel.channelName}</h3>
                <p className="text-xs text-slate-500 font-mono-numbers truncate">{channel.channelId}</p>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <Switch 
                  checked={channel.isActive}
                  onCheckedChange={() => handleToggle(channel.id, channel.isActive)}
                  className="data-[state=checked]:bg-emerald-500"
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDelete(channel.id)}
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
