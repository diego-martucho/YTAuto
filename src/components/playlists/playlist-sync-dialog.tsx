'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Globe,
  Link2,
  ListMusic,
  Loader2,
  Lock,
  PenLine,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

interface PreviewPlaylist {
  playlistId: string
  title: string
  description: string
  thumbnailUrl: string
  itemCount: number
  privacyStatus: string | null
  publishedAt: string | null
  tracked: boolean
  trackedName: string | null
  renamed: boolean
  rulesCount: number
  isNew: boolean
}

interface MissingPlaylist {
  playlistId: string
  playlistName: string
  rulesCount: number
}

export interface PlaylistSyncResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  playlists: any[]
  added: number
  renamed: number
  removed: Array<{ playlistName: string; rulesCount: number; reason: 'deselected' | 'deleted_in_youtube' }>
}

type ViewFilter = 'all' | 'selected' | 'new' | 'untracked'

const privacyIcon: Record<string, { icon: typeof Globe; label: string }> = {
  public: { icon: Globe, label: 'Pública' },
  unlisted: { icon: Link2, label: 'No listada' },
  private: { icon: Lock, label: 'Privada' },
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'h-[18px] w-[18px] rounded-md border flex items-center justify-center shrink-0 transition-colors',
        checked ? 'bg-violet-600 border-violet-500 text-white' : 'border-white/20 bg-black/30'
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </span>
  )
}

interface PlaylistSyncDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplied: (result: PlaylistSyncResult) => void
}

/**
 * Sincronización selectiva: muestra todas las listas de la cuenta de YouTube y deja elegir
 * cuáles seguir en YTAuto antes de aplicar. Las ya seguidas vienen marcadas; las demás no.
 */
export function PlaylistSyncDialog({ open, onOpenChange, onApplied }: PlaylistSyncDialogProps) {
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playlists, setPlaylists] = useState<PreviewPlaylist[]>([])
  const [missing, setMissing] = useState<MissingPlaylist[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewFilter>('all')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      setSearch('')
      setView('all')
      try {
        const res = await fetch('/api/playlists/youtube')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'No se pudieron obtener tus listas de YouTube')
        if (cancelled) return
        setPlaylists(data.playlists)
        setMissing(data.missing)
        setSelected(new Set((data.playlists as PreviewPlaylist[]).filter((p) => p.tracked).map((p) => p.playlistId)))
        // Si hay listas nuevas, arrancar mostrándolas primero
        if ((data.playlists as PreviewPlaylist[]).some((p) => p.isNew)) setView('new')
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error al conectar con YouTube')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open])

  const counts = useMemo(
    () => ({
      all: playlists.length,
      selected: selected.size,
      new: playlists.filter((p) => p.isNew).length,
      untracked: playlists.filter((p) => !p.tracked).length,
    }),
    [playlists, selected]
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return playlists.filter((p) => {
      if (view === 'selected' && !selected.has(p.playlistId)) return false
      if (view === 'new' && !p.isNew) return false
      if (view === 'untracked' && p.tracked) return false
      if (q && !p.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [playlists, view, search, selected])

  // Resumen de lo que va a pasar al aplicar
  const plan = useMemo(() => {
    const toAdd = playlists.filter((p) => !p.tracked && selected.has(p.playlistId))
    const toRemove = playlists.filter((p) => p.tracked && !selected.has(p.playlistId))
    const toRename = playlists.filter((p) => p.tracked && p.renamed && selected.has(p.playlistId))
    const rulesLost =
      toRemove.reduce((acc, p) => acc + p.rulesCount, 0) + missing.reduce((acc, p) => acc + p.rulesCount, 0)
    return { toAdd, toRemove, toRename, rulesLost }
  }, [playlists, selected, missing])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const setMany = (ids: string[], value: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (value) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  const handleApply = async () => {
    try {
      setApplying(true)
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', selectedPlaylistIds: [...selected] }),
      })
      if (!res.ok) throw new Error('Error al sincronizar listas')
      const data: PlaylistSyncResult = await res.json()
      onApplied(data)
      onOpenChange(false)
    } catch {
      toast.error('No se pudieron aplicar los cambios')
    } finally {
      setApplying(false)
    }
  }

  const visibleIds = visible.map((p) => p.playlistId)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
  const nothingChanges =
    plan.toAdd.length === 0 && plan.toRemove.length === 0 && plan.toRename.length === 0 && missing.length === 0

  const tabs: Array<{ key: ViewFilter; label: string }> = [
    { key: 'all', label: 'Todas' },
    { key: 'selected', label: 'Seleccionadas' },
    { key: 'new', label: 'Nuevas' },
    { key: 'untracked', label: 'No seguidas' },
  ]

  return (
    <Dialog open={open} onOpenChange={(o) => !applying && onOpenChange(o)}>
      <DialogContent className="glass-card border-white/[0.08] sm:max-w-2xl p-0 gap-0 bg-[#0f1523]/95 backdrop-blur-xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[85dvh] overflow-hidden">
        {/* Encabezado */}
        <div className="p-4 sm:p-5 border-b border-white/[0.06] flex flex-col gap-3 shrink-0">
          <DialogHeader className="gap-1 text-left pr-8">
            <DialogTitle className="font-display font-bold text-lg text-slate-100 flex items-center gap-2">
              <span className="p-1.5 rounded-lg border bg-violet-500/10 border-violet-500/20 text-violet-400">
                <RefreshCw className="h-4 w-4" />
              </span>
              Sincronizar listas de YouTube
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs sm:text-sm">
              Elegí qué listas querés tener en YTAuto. Las que ya seguís vienen marcadas; desmarcá las que quieras quitar.
            </DialogDescription>
          </DialogHeader>

          {!loading && !error && (
            <>
              {/* Cambios detectados automáticamente */}
              {(plan.toRename.length > 0 || missing.length > 0) && (
                <div className="flex flex-col gap-1.5 text-[11px]">
                  {plan.toRename.length > 0 && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-sky-500/20 bg-sky-500/[0.06] text-sky-200">
                      <PenLine className="h-3.5 w-3.5 mt-px shrink-0 text-sky-400" />
                      <span>
                        Se actualizará el nombre de {plan.toRename.length === 1 ? '1 lista' : `${plan.toRename.length} listas`}:{' '}
                        {plan.toRename.slice(0, 3).map((p) => `“${p.trackedName}” → “${p.title}”`).join(', ')}
                        {plan.toRename.length > 3 && '…'}
                      </span>
                    </div>
                  )}
                  {missing.length > 0 && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] text-rose-200">
                      <Trash2 className="h-3.5 w-3.5 mt-px shrink-0 text-rose-400" />
                      <span>
                        Ya no existen en YouTube y se quitarán: {missing.map((m) => m.playlistName).join(', ')}
                        {missing.some((m) => m.rulesCount > 0) && ' (junto con sus reglas)'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1">
                  {tabs.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setView(t.key)}
                      className={cn(
                        'h-8 px-2.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                        view === t.key
                          ? 'bg-violet-600/20 text-violet-300 border-violet-500/30'
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                      )}
                    >
                      {t.label}
                      <span className="ml-1.5 font-mono-numbers opacity-70">{counts[t.key]}</span>
                    </button>
                  ))}
                </div>
                <div className="relative sm:w-52">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar lista..."
                    className="pl-8 pr-8 h-8 bg-black/30 border-white/[0.08] text-xs"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      aria-label="Limpiar búsqueda"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Lista */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3">
          {loading ? (
            <div className="flex flex-col gap-1.5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-[18px] w-[18px] rounded-md" />
                  <Skeleton className="w-20 aspect-video rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-center py-12 px-6">
              <AlertTriangle className="h-7 w-7 text-amber-400 mb-2" />
              <p className="text-sm text-slate-300">{error}</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 px-6">
              <ListMusic className="h-7 w-7 text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">
                {view === 'new' ? 'No hay listas nuevas desde la última sincronización.' : 'No hay listas que coincidan.'}
              </p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMany(visibleIds, !allVisibleSelected)}
                className="w-full flex items-center gap-3 px-2 py-1.5 mb-1 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <CheckBox checked={allVisibleSelected} />
                {allVisibleSelected ? 'Desmarcar' : 'Marcar'} {visible.length === playlists.length ? 'todas' : `las ${visible.length} visibles`}
              </button>
              <ul className="flex flex-col gap-1">
                {visible.map((p) => {
                  const isChecked = selected.has(p.playlistId)
                  const willRemove = p.tracked && !isChecked
                  const willAdd = !p.tracked && isChecked
                  const privacy = p.privacyStatus ? privacyIcon[p.privacyStatus] : null
                  return (
                    <li key={p.playlistId}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isChecked}
                        onClick={() => toggle(p.playlistId)}
                        className={cn(
                          'w-full flex items-center gap-3 p-2 rounded-xl border text-left transition-colors cursor-pointer',
                          willRemove
                            ? 'border-rose-500/25 bg-rose-500/[0.05]'
                            : willAdd
                              ? 'border-violet-500/30 bg-violet-500/[0.07]'
                              : isChecked
                                ? 'border-white/[0.06] bg-white/[0.03]'
                                : 'border-transparent hover:bg-white/[0.03]'
                        )}
                      >
                        <CheckBox checked={isChecked} />
                        <div className="relative w-20 aspect-video rounded-md overflow-hidden shrink-0 border border-white/10 bg-gradient-to-br from-violet-900/40 to-indigo-900/40">
                          {p.thumbnailUrl ? (
                            <img src={p.thumbnailUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <ListMusic className="h-4 w-4 text-violet-400/70 absolute inset-0 m-auto" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-semibold text-slate-100 truncate">{p.title}</span>
                            {p.isNew && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-md border border-violet-500/30 bg-violet-500/15 text-violet-300 text-[10px] font-semibold shrink-0">
                                <Sparkles className="h-2.5 w-2.5" /> Nueva
                              </span>
                            )}
                            {p.tracked && (
                              <span className="px-1.5 py-px rounded-md border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 text-[10px] font-semibold shrink-0">
                                En YTAuto
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 min-w-0">
                            <span className="font-mono-numbers shrink-0">
                              {p.itemCount} {p.itemCount === 1 ? 'video' : 'videos'}
                            </span>
                            {privacy && (
                              <span className="inline-flex items-center gap-1 shrink-0">
                                <privacy.icon className="h-3 w-3" /> {privacy.label}
                              </span>
                            )}
                            {p.renamed && p.trackedName && (
                              <span className="truncate text-sky-300/80">antes “{p.trackedName}”</span>
                            )}
                          </div>
                          {willRemove && (
                            <p className="text-[11px] text-rose-300/90 mt-0.5">
                              Se quitará de YTAuto
                              {p.rulesCount > 0 && ` junto con ${p.rulesCount} ${p.rulesCount === 1 ? 'regla' : 'reglas'}`}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        {/* Pie con resumen */}
        <div className="px-4 sm:px-5 py-3 border-t border-white/[0.06] bg-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
            {loading || error ? (
              <span>&nbsp;</span>
            ) : nothingChanges ? (
              <span>No hay cambios: tus listas ya están al día.</span>
            ) : (
              <>
                {plan.toAdd.length > 0 && <span className="text-violet-300">+{plan.toAdd.length} se agregan</span>}
                {plan.toRename.length > 0 && <span className="text-sky-300">{plan.toRename.length} se renombran</span>}
                {plan.toRemove.length + missing.length > 0 && (
                  <span className="text-rose-300">
                    −{plan.toRemove.length + missing.length} se quitan
                    {plan.rulesLost > 0 && ` (${plan.rulesLost} ${plan.rulesLost === 1 ? 'regla' : 'reglas'})`}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={applying}
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={loading || !!error || applying}
              onClick={handleApply}
              className={cn(
                'text-white font-semibold cursor-pointer',
                plan.toRemove.length + missing.length > 0 ? 'bg-rose-600 hover:bg-rose-700' : 'bg-violet-600 hover:bg-violet-700'
              )}
            >
              {applying ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
              {nothingChanges ? 'Actualizar datos' : 'Aplicar cambios'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
