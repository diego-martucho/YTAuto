'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  Radio,
  Trash2,
  Loader2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { normalizeText } from '@/lib/utils'

interface Channel {
  id: string
  channelId: string
  channelName: string
  channelUrl: string | null
  channelThumbnail: string | null
  isActive: boolean
}

interface VerifiedChannelData {
  channelId: string
  channelName: string
  thumbnail: string
  alreadyAdded?: boolean
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [inputValue, setInputValue] = useState('@')

  // Verification states
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifiedChannel, setVerifiedChannel] = useState<VerifiedChannelData | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  // Custom Delete Modal state
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Search, Filter & Sort states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'active_first'>('name_asc')

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

  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open)
    if (open) {
      setInputValue('@')
      setVerifiedChannel(null)
      setVerifyError(null)
    }
  }

  const handleVerifyChannel = async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || trimmed === '@') {
      setVerifyError('Ingresa un @handle, URL o ID de canal')
      setVerifiedChannel(null)
      return
    }

    try {
      setIsVerifying(true)
      setVerifyError(null)
      setVerifiedChannel(null)

      const res = await fetch(`/api/channels/verify?input=${encodeURIComponent(trimmed)}`)
      const data = await res.json()

      if (!res.ok || !data.exists) {
        setVerifyError(data.error || 'El canal no existe en YouTube o no se pudo encontrar.')
        setVerifiedChannel(null)
      } else {
        setVerifiedChannel({
          ...data.channel,
          alreadyAdded: data.alreadyAdded,
        })
      }
    } catch (error) {
      setVerifyError('Error al contactar con YouTube. Intenta de nuevo.')
      setVerifiedChannel(null)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed || trimmed === '@') return

    if (verifiedChannel?.alreadyAdded) {
      toast.error('Este canal ya está en tu lista de canales monitorizados')
      return
    }

    try {
      setIsAdding(true)
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmed })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al agregar canal')
      }

      toast.success(`Canal "${data.channelName || 'YouTube'}" agregado correctamente`)
      setIsDialogOpen(false)
      setInputValue('@')
      setVerifiedChannel(null)
      setVerifyError(null)
      fetchChannels()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'No se pudo agregar el canal'
      toast.error(msg)
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

  const confirmDeleteChannel = async () => {
    if (!channelToDelete) return
    try {
      setIsDeleting(true)
      const res = await fetch(`/api/channels`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: channelToDelete.id })
      })
      if (!res.ok) throw new Error('Error al eliminar canal')
      setChannels(channels.filter(c => c.id !== channelToDelete.id))
      toast.success(`Canal "${channelToDelete.channelName}" eliminado`)
      setChannelToDelete(null)
    } catch (error) {
      toast.error('Error al eliminar el canal')
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtered and sorted channels
  const filteredChannels = useMemo(() => {
    return channels
      .filter((c) => {
        // Status filter
        if (statusFilter === 'active' && !c.isActive) return false
        if (statusFilter === 'inactive' && c.isActive) return false

        // Search query filter (ignoring case and accents)
        if (searchQuery.trim()) {
          const normQuery = normalizeText(searchQuery)
          const normName = normalizeText(c.channelName)
          const normId = normalizeText(c.channelId)
          return normName.includes(normQuery) || normId.includes(normQuery)
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') {
          return a.channelName.localeCompare(b.channelName, 'es', { sensitivity: 'base' })
        }
        if (sortBy === 'name_desc') {
          return b.channelName.localeCompare(a.channelName, 'es', { sensitivity: 'base' })
        }
        if (sortBy === 'active_first') {
          return Number(b.isActive) - Number(a.isActive)
        }
        return 0
      })
  }, [channels, searchQuery, statusFilter, sortBy])

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'all' || sortBy !== 'name_asc'

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setSortBy('name_asc')
  }

  return (
    <div className="space-y-8 animate-pop-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-display text-slate-100">Canales Monitorizados</h1>
          <p className="text-slate-400 mt-1">Administra los canales de YouTube de los cuales quieres obtener videos.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
          <DialogTrigger>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-sm shadow-indigo-600/30 font-semibold cursor-pointer">
              <Plus className="mr-2 h-4 w-4" /> Agregar canal
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-white/[0.08] sm:max-w-[480px] p-6 bg-[#0f1523]/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="font-display font-bold text-lg text-slate-100">Agregar nuevo canal</DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                Ingresa el @handle, URL o ID de YouTube. El sistema corroborará si existe antes de agregarlo.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddChannel}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="channelInput" className="text-slate-300 text-sm font-medium">URL o @Handle del Canal</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="channelInput"
                      placeholder="Ej: @midudev o youtube.com/@canal" 
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value)
                        setVerifiedChannel(null)
                        setVerifyError(null)
                      }}
                      className="bg-black/30 border-white/[0.1] text-slate-100 placeholder:text-slate-600 font-mono-numbers focus-visible:ring-indigo-500/50"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleVerifyChannel}
                      disabled={isVerifying || !inputValue.trim() || inputValue.trim() === '@'}
                      className="shrink-0 border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      {isVerifying ? (
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                      ) : (
                        'Corroborar'
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Formatos soportados: @handle, youtube.com/@handle o ID (UC...)
                  </p>
                </div>

                {/* Feedback de corroboración */}
                {isVerifying && (
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2.5 text-xs text-indigo-300 animate-pop-in">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400 shrink-0" />
                    <span>Verificando existencia en los servidores de YouTube...</span>
                  </div>
                )}

                {verifyError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-300 animate-pop-in">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Canal no encontrado</span>
                      <span>{verifyError}</span>
                    </div>
                  </div>
                )}

                {verifiedChannel && (
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/[0.08] flex items-center gap-3.5 animate-pop-in">
                    {verifiedChannel.thumbnail ? (
                      <img
                        src={verifiedChannel.thumbnail}
                        alt={verifiedChannel.channelName}
                        className="w-11 h-11 rounded-full border border-white/10 shrink-0 object-cover"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-indigo-950 border border-indigo-500/30 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-indigo-300">
                          {verifiedChannel.channelName.substring(0, 1).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-100 text-sm truncate">
                          {verifiedChannel.channelName}
                        </h4>
                        {verifiedChannel.alreadyAdded ? (
                          <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                            Ya monitorizado
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                            <CheckCircle2 className="h-3 w-3 mr-0.5" /> Existe
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono-numbers truncate mt-0.5">
                        {verifiedChannel.channelId}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsDialogOpen(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isAdding || isVerifying || !inputValue.trim() || inputValue.trim() === '@' || verifiedChannel?.alreadyAdded} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-sm shadow-indigo-600/30"
                >
                  {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {verifiedChannel && !verifiedChannel.alreadyAdded ? 'Confirmar y Agregar' : 'Agregar Canal'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar: Buscador, Filtros y Orden */}
      {channels.length > 0 && (
        <div className="glass-card p-4 rounded-2xl border border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              type="text"
              placeholder="Buscar por nombre o ID de canal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-9 bg-black/30 border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500/40 text-sm h-9"
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
            {/* Filtro de estado */}
            <div className="flex items-center gap-1.5 shrink-0">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val as 'all' | 'active' | 'inactive')}>
                <SelectTrigger className="bg-black/30 border-white/[0.08] text-slate-200 text-xs h-9 min-w-32">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1523] border-white/[0.08] text-slate-200">
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Solo activos</SelectItem>
                  <SelectItem value="inactive">Solo inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Orden */}
            <div className="flex items-center gap-1.5 shrink-0">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <Select value={sortBy} onValueChange={(val) => val && setSortBy(val as 'name_asc' | 'name_desc' | 'active_first')}>
                <SelectTrigger className="bg-black/30 border-white/[0.08] text-slate-200 text-xs h-9 min-w-36">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1523] border-white/[0.08] text-slate-200">
                  <SelectItem value="name_asc">Nombre (A - Z)</SelectItem>
                  <SelectItem value="name_desc">Nombre (Z - A)</SelectItem>
                  <SelectItem value="active_first">Activos primero</SelectItem>
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
      {!loading && channels.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Mostrando <strong className="text-slate-200">{filteredChannels.length}</strong> de <strong className="text-slate-200">{channels.length}</strong> {channels.length === 1 ? 'canal' : 'canales'}
          </span>
          {hasActiveFilters && (
            <span className="text-indigo-400">Filtros aplicados</span>
          )}
        </div>
      )}

      {/* Lista de canales */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
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
      ) : filteredChannels.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-white/[0.01]">
          <Search className="h-8 w-8 text-slate-500 mb-3" />
          <h3 className="text-base font-semibold text-slate-200 font-display">Sin coincidencias</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-sm">
            No se encontró ningún canal que coincida con tus criterios de búsqueda o filtros.
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
          {filteredChannels.map((channel) => (
            <div key={channel.id} className="glass-card-interactive rounded-2xl p-5 border border-white/[0.08] flex items-center gap-4 transition-all hover:bg-white/[0.04]">
              {channel.channelThumbnail ? (
                <img src={channel.channelThumbnail} alt={channel.channelName} className="w-12 h-12 rounded-full border border-white/10 shrink-0 object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-slate-400">{channel.channelName.substring(0, 1).toUpperCase()}</span>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-slate-100 truncate text-sm" title={channel.channelName}>{channel.channelName}</h3>
                  {channel.channelUrl && (
                    <a
                      href={channel.channelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-indigo-400 transition-colors shrink-0"
                      title="Abrir en YouTube"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-mono-numbers truncate mt-0.5">{channel.channelId}</p>
              </div>

              <div className="flex items-center gap-3 ml-auto shrink-0">
                <Switch 
                  checked={channel.isActive}
                  onCheckedChange={() => handleToggle(channel.id, channel.isActive)}
                  className="data-[state=checked]:bg-emerald-500"
                  title={channel.isActive ? "Desactivar monitorización" : "Activar monitorización"}
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setChannelToDelete(channel)}
                  className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 h-8 w-8 cursor-pointer"
                  title="Eliminar canal"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmación para eliminar canal con estilos de la app */}
      <ConfirmDialog
        open={!!channelToDelete}
        onOpenChange={(open) => !open && setChannelToDelete(null)}
        title="¿Eliminar canal monitorizado?"
        description={
          <>
            ¿Estás seguro de que deseas eliminar el canal <strong className="text-slate-200 font-semibold">{channelToDelete?.channelName}</strong>? Se eliminarán también las reglas asociadas a este canal.
          </>
        }
        confirmText="Eliminar canal"
        cancelText="Cancelar"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={confirmDeleteChannel}
      />
    </div>
  )
}
