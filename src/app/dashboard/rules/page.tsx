'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  GitBranch,
  Trash2,
  ArrowRight,
  Loader2,
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
  Pencil,
  Ban,
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { normalizeText } from '@/lib/utils'

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
  excludeValue: string | null
  includeShorts?: boolean
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
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit Rule state
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)

  // Custom Delete Modal state
  const [ruleToDelete, setRuleToDelete] = useState<Rule | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Search, Filter & Sort states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'all_videos' | 'title_contains' | 'title_any_of'>('all')
  const [sortBy, setSortBy] = useState<'channel_asc' | 'channel_desc' | 'playlist_asc' | 'active_first'>('channel_asc')
  
  const [formData, setFormData] = useState({
    watchedChannelId: '',
    targetPlaylistId: '',
    filterType: 'all' as 'all' | 'title_contains' | 'title_any_of',
    filterValue: '',
    excludeValue: '',
    includeShorts: false
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

  // Sorted channels and playlists alphabetically for the dropdowns
  const sortedChannels = useMemo(() => {
    return [...channels].sort((a, b) =>
      a.channelName.localeCompare(b.channelName, 'es', { sensitivity: 'base' })
    )
  }, [channels])

  const sortedPlaylists = useMemo(() => {
    return [...playlists].sort((a, b) =>
      a.playlistName.localeCompare(b.playlistName, 'es', { sensitivity: 'base' })
    )
  }, [playlists])

  const handleOpenCreateDialog = (open: boolean) => {
    setIsDialogOpen(open)
    if (open) {
      setEditingRuleId(null)
      setFormData({
        watchedChannelId: '',
        targetPlaylistId: '',
        filterType: 'all',
        filterValue: '',
        excludeValue: '', includeShorts: false
      })
    }
  }

  const handleOpenEditDialog = (rule: Rule) => {
    setEditingRuleId(rule.id)
    setFormData({
      watchedChannelId: rule.watchedChannelId,
      targetPlaylistId: rule.targetPlaylistId,
      filterType: rule.filterType,
      filterValue: rule.filterValue || '',
      excludeValue: rule.excludeValue || '',
      includeShorts: rule.includeShorts ?? false
    })
    setIsDialogOpen(true)
  }

  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.watchedChannelId || !formData.targetPlaylistId) {
      toast.error('Debes seleccionar un canal de origen y una lista de destino')
      return
    }

    if (formData.filterType !== 'all' && !formData.filterValue.trim()) {
      toast.error('Debes ingresar un valor para la condición incluyente')
      return
    }

    try {
      setIsSubmitting(true)
      const isEditing = !!editingRuleId
      const url = '/api/rules'
      const method = isEditing ? 'PATCH' : 'POST'
      const payload = {
        ...(isEditing ? { id: editingRuleId } : {}),
        watchedChannelId: formData.watchedChannelId,
        targetPlaylistId: formData.targetPlaylistId,
        filterType: formData.filterType,
        filterValue: formData.filterType === 'all' ? null : formData.filterValue.trim(),
        excludeValue: formData.excludeValue.trim() ? formData.excludeValue.trim() : null,
        includeShorts: formData.includeShorts
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || (isEditing ? 'Error al actualizar regla' : 'Error al crear regla'))
      }
      
      toast.success(isEditing ? 'Regla actualizada correctamente' : 'Regla creada correctamente')
      setIsDialogOpen(false)
      setEditingRuleId(null)
      setFormData({ watchedChannelId: '', targetPlaylistId: '', filterType: 'all', filterValue: '', excludeValue: '', includeShorts: false })
      fetchData()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'No se pudo guardar la regla'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
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
      toast.success('Estado de la regla actualizado')
    } catch (error) {
      toast.error('Error al cambiar el estado de la regla')
    }
  }

  const confirmDeleteRule = async () => {
    if (!ruleToDelete) return
    try {
      setIsDeleting(true)
      const res = await fetch(`/api/rules`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ruleToDelete.id })
      })
      if (!res.ok) throw new Error('Error al eliminar regla')
      setRules(rules.filter(r => r.id !== ruleToDelete.id))
      toast.success('Regla eliminada')
      setRuleToDelete(null)
    } catch (error) {
      toast.error('Error al eliminar la regla')
    } finally {
      setIsDeleting(false)
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

  // Filtered and sorted rules
  const filteredRules = useMemo(() => {
    return rules
      .filter((r) => {
        // Status filter
        if (statusFilter === 'active' && !r.isActive) return false
        if (statusFilter === 'inactive' && r.isActive) return false

        // Filter type filter
        if (typeFilter === 'all_videos' && r.filterType !== 'all') return false
        if (typeFilter === 'title_contains' && r.filterType !== 'title_contains') return false
        if (typeFilter === 'title_any_of' && r.filterType !== 'title_any_of') return false

        // Search query (ignores case and accents)
        if (searchQuery.trim()) {
          const normQuery = normalizeText(searchQuery)
          const normChannel = normalizeText(r.channelName)
          const normPlaylist = normalizeText(r.playlistName)
          const normFilterVal = normalizeText(r.filterValue)
          const normExcludeVal = normalizeText(r.excludeValue)
          return (
            normChannel.includes(normQuery) ||
            normPlaylist.includes(normQuery) ||
            normFilterVal.includes(normQuery) ||
            normExcludeVal.includes(normQuery)
          )
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'channel_asc') {
          return (a.channelName || '').localeCompare(b.channelName || '', 'es', { sensitivity: 'base' })
        }
        if (sortBy === 'channel_desc') {
          return (b.channelName || '').localeCompare(a.channelName || '', 'es', { sensitivity: 'base' })
        }
        if (sortBy === 'playlist_asc') {
          return (a.playlistName || '').localeCompare(b.playlistName || '', 'es', { sensitivity: 'base' })
        }
        if (sortBy === 'active_first') {
          return Number(b.isActive) - Number(a.isActive)
        }
        return 0
      })
  }, [rules, searchQuery, statusFilter, typeFilter, sortBy])

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'all' || typeFilter !== 'all' || sortBy !== 'channel_asc'

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setTypeFilter('all')
    setSortBy('channel_asc')
  }

  return (
    <div className="space-y-8 animate-pop-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-display text-slate-100">Reglas de Organización</h1>
          <p className="text-slate-400 mt-1">Configura cómo se envían los videos de los canales a tus listas.</p>
        </div>
        
        {/* Modal de Crear / Editar Regla */}
        <Dialog open={isDialogOpen} onOpenChange={handleOpenCreateDialog}>
          <DialogTrigger>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white border-none shadow-sm shadow-amber-600/30 font-semibold cursor-pointer shrink-0">
              <Plus className="mr-2 h-4 w-4" /> Crear regla
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-white/[0.08] sm:max-w-xl md:max-w-2xl p-6 sm:p-7 bg-[#0f1523]/95 backdrop-blur-xl">
            <DialogHeader className="gap-1.5 text-left">
              <DialogTitle className="font-display font-bold text-xl text-slate-100">
                {editingRuleId ? 'Editar regla de organización' : 'Crear nueva regla'}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                Define el origen, destino y condiciones incluyentes o excluyentes para filtrar los videos.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitRule} className="space-y-5 mt-2">
              {/* Origen y Destino distribuidos en 2 columnas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Canal de origen */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm font-medium flex items-center justify-between">
                    <span>Canal de origen</span>
                    <span className="text-xs text-slate-500 font-normal">YouTube</span>
                  </Label>
                  <Select
                    value={formData.watchedChannelId || ""}
                    onValueChange={(val: string | null) => setFormData({ ...formData, watchedChannelId: val ?? "" })}
                    itemToStringLabel={(val) => (val ? channels.find(c => c.id === val)?.channelName || val : "")}
                  >
                    <SelectTrigger className="w-full h-10 bg-black/30 border-white/[0.08] text-slate-100 px-3 focus-visible:ring-amber-500/40">
                      <SelectValue placeholder="Selecciona un canal">
                        {formData.watchedChannelId
                          ? (channels.find(c => c.id === formData.watchedChannelId)?.channelName || formData.watchedChannelId)
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent
                      alignItemWithTrigger={false}
                      className="bg-[#0f1523] border border-white/[0.1] text-slate-100 max-h-60 w-(--anchor-width) min-w-[280px] shadow-2xl rounded-xl p-1.5"
                    >
                      {sortedChannels.length === 0 ? (
                        <div className="p-3 text-xs text-slate-400 text-center">
                          No tienes canales monitorizados aún.
                        </div>
                      ) : (
                        sortedChannels.map((c) => {
                          const channelRulesCount = rules.filter(r => r.watchedChannelId === c.id && r.id !== editingRuleId).length
                          const hasRules = channelRulesCount > 0

                          return (
                            <SelectItem
                              key={c.id}
                              value={c.id}
                              label={c.channelName}
                              className="py-2.5 px-3 cursor-pointer hover:bg-white/[0.06] rounded-lg transition-colors"
                            >
                              <div className="flex items-center justify-between w-full gap-3">
                                <span className="truncate font-medium text-slate-200">{c.channelName}</span>
                                {hasRules && (
                                  <span
                                    className="shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25 font-semibold"
                                    title={`Este canal ya tiene ${channelRulesCount} ${channelRulesCount === 1 ? 'regla' : 'reglas'}`}
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                                    {channelRulesCount === 1 ? '1 regla' : `${channelRulesCount} reglas`}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          )
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Lista de destino */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm font-medium flex items-center justify-between">
                    <span>Lista de destino</span>
                    <span className="text-xs text-slate-500 font-normal">Destino</span>
                  </Label>
                  <Select
                    value={formData.targetPlaylistId || ""}
                    onValueChange={(val: string | null) => setFormData({ ...formData, targetPlaylistId: val ?? "" })}
                    itemToStringLabel={(val) => (val ? playlists.find(p => p.id === val)?.playlistName || val : "")}
                  >
                    <SelectTrigger className="w-full h-10 bg-black/30 border-white/[0.08] text-slate-100 px-3 focus-visible:ring-amber-500/40">
                      <SelectValue placeholder="Selecciona una lista">
                        {formData.targetPlaylistId
                          ? (playlists.find(p => p.id === formData.targetPlaylistId)?.playlistName || formData.targetPlaylistId)
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent
                      alignItemWithTrigger={false}
                      className="bg-[#0f1523] border border-white/[0.1] text-slate-100 max-h-60 w-(--anchor-width) min-w-[280px] shadow-2xl rounded-xl p-1.5"
                    >
                      {sortedPlaylists.length === 0 ? (
                        <div className="p-3 text-xs text-slate-400 text-center">
                          No tienes listas de reproducción sincronizadas.
                        </div>
                      ) : (
                        sortedPlaylists.map((p) => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            label={p.playlistName}
                            className="py-2.5 px-3 cursor-pointer hover:bg-white/[0.06] rounded-lg transition-colors"
                          >
                            <span className="truncate font-medium text-slate-200">{p.playlistName}</span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Condición Incluyente (Filtro) */}
              <div className="space-y-2 pt-1">
                <Label className="text-slate-300 text-sm font-medium">Condición incluyente de título</Label>
                <Select
                  value={formData.filterType}
                  onValueChange={(val) => val && setFormData({ ...formData, filterType: val as 'all' | 'title_contains' | 'title_any_of' })}
                >
                  <SelectTrigger className="w-full h-10 bg-black/30 border-white/[0.08] text-slate-100 px-3 focus-visible:ring-amber-500/40">
                    <SelectValue placeholder="Selecciona un tipo de filtro" />
                  </SelectTrigger>
                  <SelectContent
                    alignItemWithTrigger={false}
                    className="bg-[#0f1523] border border-white/[0.1] text-slate-100 shadow-2xl rounded-xl p-1.5"
                  >
                    <SelectItem value="all" className="cursor-pointer py-2 px-3 hover:bg-white/[0.06] rounded-lg">
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-slate-200 text-sm">Todos los videos</span>
                        <span className="text-xs text-slate-400">Agrega todos los videos nuevos del canal a la lista sin filtrar</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="title_contains" className="cursor-pointer py-2 px-3 hover:bg-white/[0.06] rounded-lg">
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-slate-200 text-sm">Título contiene frase</span>
                        <span className="text-xs text-slate-400">El título debe contener el texto exacto (ignora mayúsculas y acentos)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="title_any_of" className="cursor-pointer py-2 px-3 hover:bg-white/[0.06] rounded-lg">
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-slate-200 text-sm">Título contiene alguna palabra clave</span>
                        <span className="text-xs text-slate-400">Si el título contiene al menos una de las palabras (separadas por comas)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.filterType !== 'all' && (
                <div className="space-y-2 animate-pop-in pt-1">
                  <Label htmlFor="filterValue" className="text-slate-300 text-sm font-medium">
                    {formData.filterType === 'title_contains' ? 'Texto que debe contener el título' : 'Palabras clave incluyentes (separadas por comas)'}
                  </Label>
                  <Input 
                    id="filterValue"
                    placeholder={formData.filterType === 'title_contains' ? 'Ej: resumen semanal' : 'Ej: resumen, noticias, informe, especial'} 
                    value={formData.filterValue}
                    onChange={(e) => setFormData({ ...formData, filterValue: e.target.value })}
                    className="h-10 bg-black/30 border-white/[0.08] text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-500/40 text-sm"
                  />
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                    <span className="text-amber-400">💡</span>
                    <span>Las condiciones ignoran automáticamente mayúsculas y acentos (ej: &quot;canción&quot; coincidirá con &quot;Cancion&quot; o &quot;CANCION&quot;).</span>
                  </p>
                </div>
              )}

              {/* Condición Excluyente (Requirement 1) */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <Label htmlFor="excludeValue" className="text-slate-300 text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Ban className="h-3.5 w-3.5 text-rose-400" />
                    Condición excluyente (Opcional)
                  </span>
                  <span className="text-xs text-slate-500 font-normal">Palabras prohibidas</span>
                </Label>
                <Input
                  id="excludeValue"
                  placeholder="Ej: shorts, en vivo, trailer, gameplay"
                  value={formData.excludeValue}
                  onChange={(e) => setFormData({ ...formData, excludeValue: e.target.value })}
                  className="h-10 bg-black/30 border-white/[0.08] text-slate-100 placeholder:text-slate-600 focus-visible:ring-rose-500/40 text-sm"
                />
                <p className="text-xs text-slate-400">
                  Si el título del video contiene alguna de estas palabras (separadas por comas), no se añadirá a la lista.
                </p>
              </div>

              {/* Opción de incluir/excluir Shorts */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-white/[0.04] bg-white/[0.02]">
                <div className="space-y-0.5">
                  <Label htmlFor="includeShorts" className="text-slate-300 text-sm font-medium">
                    Incluir YouTube Shorts
                  </Label>
                  <p className="text-xs text-slate-400">
                    Si está desactivado, se omitirán los videos de 120 segundos o menos.
                  </p>
                </div>
                <Switch
                  id="includeShorts"
                  checked={formData.includeShorts}
                  onCheckedChange={(checked) => setFormData({ ...formData, includeShorts: checked })}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>

              <DialogFooter className="gap-2 sm:justify-end pt-3 border-t border-white/[0.06]">
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
                  disabled={isSubmitting || !formData.watchedChannelId || !formData.targetPlaylistId}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer shadow-sm shadow-amber-600/30 px-5"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRuleId ? 'Guardar Cambios' : 'Crear Regla'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar: Buscador, Filtros y Orden */}
      {rules.length > 0 && (
        <div className="glass-card p-4 rounded-2xl border border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              type="text"
              placeholder="Buscar por canal, lista o palabra clave..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-9 bg-black/30 border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500/40 text-sm h-9"
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
                  <SelectItem value="all">Todas las reglas</SelectItem>
                  <SelectItem value="active">Solo activas</SelectItem>
                  <SelectItem value="inactive">Solo inactivas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de tipo de condición */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <Select value={typeFilter} onValueChange={(val) => val && setTypeFilter(val as 'all' | 'all_videos' | 'title_contains' | 'title_any_of')}>
                <SelectTrigger className="bg-black/30 border-white/[0.08] text-slate-200 text-xs h-9 min-w-36">
                  <SelectValue placeholder="Condición" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1523] border-white/[0.08] text-slate-200">
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="all_videos">Todos los videos</SelectItem>
                  <SelectItem value="title_contains">Título contiene</SelectItem>
                  <SelectItem value="title_any_of">Contiene alguno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Orden */}
            <div className="flex items-center gap-1.5 shrink-0">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <Select value={sortBy} onValueChange={(val) => val && setSortBy(val as 'channel_asc' | 'channel_desc' | 'playlist_asc' | 'active_first')}>
                <SelectTrigger className="bg-black/30 border-white/[0.08] text-slate-200 text-xs h-9 min-w-40">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1523] border-white/[0.08] text-slate-200">
                  <SelectItem value="channel_asc">Canal (A - Z)</SelectItem>
                  <SelectItem value="channel_desc">Canal (Z - A)</SelectItem>
                  <SelectItem value="playlist_asc">Lista destino (A - Z)</SelectItem>
                  <SelectItem value="active_first">Activas primero</SelectItem>
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
      {!loading && rules.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Mostrando <strong className="text-slate-200">{filteredRules.length}</strong> de <strong className="text-slate-200">{rules.length}</strong> {rules.length === 1 ? 'regla' : 'reglas'}
          </span>
          {hasActiveFilters && (
            <span className="text-amber-400">Filtros aplicados</span>
          )}
        </div>
      )}

      {/* Lista de reglas en DOS COLUMNAS (Requirement 3) */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
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
      ) : filteredRules.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-white/[0.01]">
          <Search className="h-8 w-8 text-slate-500 mb-3" />
          <h3 className="text-base font-semibold text-slate-200 font-display">Sin coincidencias</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-sm">
            No se encontró ninguna regla que coincida con tus criterios de búsqueda o filtros.
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRules.map((rule) => (
            <div
              key={rule.id}
              className="glass-card-interactive rounded-2xl p-5 border border-white/[0.08] flex flex-col justify-between gap-4 transition-all hover:bg-white/[0.04]"
            >
              {/* Header: Canal -> Lista y Controles */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-slate-100 font-semibold flex-wrap flex-1 min-w-0">
                  <span className="truncate max-w-[180px] text-sm text-slate-200" title={rule.channelName}>
                    {rule.channelName || 'Canal desconocido'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span className="truncate max-w-[180px] text-sm text-indigo-300" title={rule.playlistName}>
                    {rule.playlistName || 'Lista desconocida'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Switch 
                    checked={rule.isActive}
                    onCheckedChange={() => handleToggle(rule.id, rule.isActive)}
                    className="data-[state=checked]:bg-emerald-500 scale-90"
                    title={rule.isActive ? "Desactivar regla" : "Activar regla"}
                  />
                  {/* Botón de editar regla (Requirement 2) */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEditDialog(rule)}
                    className="text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 h-7 w-7 cursor-pointer"
                    title="Editar regla"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setRuleToDelete(rule)}
                    className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 h-7 w-7 cursor-pointer"
                    title="Eliminar regla"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Badges de Condiciones Incluyente y Excluyente */}
              <div className="flex flex-col gap-2 pt-1 border-t border-white/[0.04]">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-[11px] shrink-0">
                    {getFilterBadgeLabel(rule.filterType)}
                  </Badge>
                  {rule.filterValue && (
                    <span className="text-xs text-slate-300 bg-slate-800/70 px-2 py-0.5 rounded border border-white/[0.06] font-mono-numbers truncate max-w-[200px]" title={rule.filterValue}>
                      &ldquo;{rule.filterValue}&rdquo;
                    </span>
                  )}
                </div>

                {/* Badge de exclusión si tiene condición excluyente */}
                {rule.excludeValue && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-300">
                    <Badge variant="outline" className="border-rose-500/30 text-rose-400 bg-rose-500/10 text-[10px] shrink-0 flex items-center gap-1">
                      <Ban className="h-2.5 w-2.5" /> Excluye
                    </Badge>
                    <span className="text-[11px] text-rose-300/90 font-mono-numbers truncate max-w-[220px]" title={rule.excludeValue}>
                      &ldquo;{rule.excludeValue}&rdquo;
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmación para eliminar regla con estilos de la app */}
      <ConfirmDialog
        open={!!ruleToDelete}
        onOpenChange={(open) => !open && setRuleToDelete(null)}
        title="¿Eliminar regla de organización?"
        description={
          <>
            ¿Estás seguro de que deseas eliminar la regla entre <strong className="text-slate-200 font-semibold">{ruleToDelete?.channelName}</strong> y <strong className="text-indigo-300 font-semibold">{ruleToDelete?.playlistName}</strong>? Los videos futuros no se agregarán automáticamente a esta lista.
          </>
        }
        confirmText="Eliminar regla"
        cancelText="Cancelar"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={confirmDeleteRule}
      />
    </div>
  )
}
