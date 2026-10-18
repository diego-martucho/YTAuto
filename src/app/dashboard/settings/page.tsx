'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Clock,
  Shield,
  Bell,
  CheckCircle2,
  Loader2,
  Save,
  Globe,
  AlertTriangle,
  LogOut,
  Download,
  Upload,
  Database,
  FileJson,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const TIMEZONES = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina - Buenos Aires (UTC-3)' },
  { value: 'America/Montevideo', label: 'Uruguay - Montevideo (UTC-3)' },
  { value: 'America/Santiago', label: 'Chile - Santiago (UTC-4 / UTC-3)' },
  { value: 'America/Sao_Paulo', label: 'Brasil - São Paulo (UTC-3)' },
  { value: 'America/Bogota', label: 'Colombia - Bogotá (UTC-5)' },
  { value: 'America/Lima', label: 'Perú - Lima (UTC-5)' },
  { value: 'America/Mexico_City', label: 'México - Ciudad de México (UTC-6)' },
  { value: 'America/New_York', label: 'EE.UU. - Nueva York (EST/EDT)' },
  { value: 'Europe/Madrid', label: 'España - Madrid (CET/CEST)' },
  { value: 'UTC', label: 'UTC (Tiempo Universal Coordinado)' },
]

const SYNC_HOURS = Array.from({ length: 24 }, (_, i) => {
  const hh = String(i).padStart(2, '0')
  return { value: `${hh}:00`, label: `${hh}:00 hs` }
})

interface SettingsData {
  id?: string
  timezone: string
  syncTime: string
  notificationsEnabled: boolean
  notificationEmail?: string | null
  tokenStatus?: { valid: boolean; reason?: string }
}

interface BackupPreview {
  fileName: string
  exportedAt: string
  channelsCount: number
  playlistsCount: number
  rulesCount: number
  rawPayload: unknown
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    timezone: 'America/Argentina/Buenos_Aires',
    syncTime: '06:00',
    notificationsEnabled: true,
    notificationEmail: '',
  })
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Backup Export / Import state
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error('Error al cargar configuración')
      const data = await res.json()
      setSettings({
        timezone: data.timezone || 'America/Argentina/Buenos_Aires',
        syncTime: data.syncTime || '00:00',
        notificationsEnabled: data.notificationsEnabled ?? true,
        notificationEmail: data.notificationEmail || '',
        tokenStatus: data.tokenStatus || { valid: false, reason: 'unknown_error' },
      })
    } catch {
      toast.error('Error al cargar las preferencias')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!res.ok) throw new Error('Error al guardar configuración')
      toast.success('Configuración guardada correctamente')
    } catch {
      toast.error('No se pudo guardar la configuración')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportBackup = async () => {
    try {
      setIsExporting(true)
      const res = await fetch('/api/settings/backup')
      if (!res.ok) throw new Error('Error al generar respaldo')
      const payload = await res.json()

      const dateStr = new Date().toISOString().split('T')[0]
      const fileName = `ytauto-backup-${dateStr}.json`
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Archivo de respaldo exportado correctamente')
    } catch {
      toast.error('No se pudo exportar la configuración')
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)

      if (
        !parsed ||
        parsed.app !== 'YTAuto' ||
        !parsed.data ||
        !Array.isArray(parsed.data.channels) ||
        !Array.isArray(parsed.data.playlists) ||
        !Array.isArray(parsed.data.rules)
      ) {
        toast.error('El archivo seleccionado no es un respaldo válido de YTAuto')
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      setBackupPreview({
        fileName: file.name,
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        channelsCount: parsed.data.channels.length,
        playlistsCount: parsed.data.playlists.length,
        rulesCount: parsed.data.rules.length,
        rawPayload: parsed,
      })
    } catch {
      toast.error('No se pudo leer el archivo JSON. Verifica que no esté dañado.')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleConfirmImport = async () => {
    if (!backupPreview) return

    try {
      setIsImporting(true)
      const res = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backup: backupPreview.rawPayload,
          mode: importMode,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al importar la configuración')
      }

      toast.success(data.message || 'Configuración importada correctamente')
      setBackupPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      fetchSettings()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al importar configuración'
      toast.error(msg)
    } finally {
      setIsImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 animate-pop-in">
        <div className="space-y-2 text-center sm:text-left">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 animate-pop-in">
      {/* Encabezado centrado visualmente en el contenedor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight text-slate-100">
            Configuración
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Administra las opciones de sincronización automática, respaldos y preferencias de tu cuenta.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-600/30 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar cambios
        </Button>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Horario de Ejecución y Sincronización Automática */}
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08] flex flex-col gap-5">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-100 text-lg">
                Sincronización Automática
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                YTAuto revisa automáticamente tus canales y aplica las reglas una sola vez al día.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                Horario de ejecución diaria
              </Label>
              <Select
                value={settings.syncTime || '06:00'}
                onValueChange={(val) => val && setSettings({ ...settings, syncTime: val })}
              >
                <SelectTrigger className="w-full h-10 bg-black/30 border-white/[0.1] text-slate-100 font-mono-numbers">
                  <SelectValue placeholder="Selecciona una hora" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1523] border-white/[0.1] text-slate-100 max-h-60">
                  {SYNC_HOURS.map((h) => (
                    <SelectItem key={h.value} value={h.value} className="font-mono-numbers cursor-pointer">
                      {h.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">
                Hora en la que se ejecutará la sincronización única del día.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-indigo-400" />
                Zona horaria
              </Label>
              <Select
                value={settings.timezone || 'America/Argentina/Buenos_Aires'}
                onValueChange={(val) => val && setSettings({ ...settings, timezone: val })}
              >
                <SelectTrigger className="w-full h-10 bg-black/30 border-white/[0.1] text-slate-100">
                  <SelectValue placeholder="Selecciona tu zona horaria" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1523] border-white/[0.1] text-slate-100 max-h-60">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value} className="cursor-pointer">
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">
                Se utiliza para calcular tu horario y las métricas del día.
              </p>
            </div>
          </div>

          <div className="mt-1 pt-4 border-t border-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <div>
                <p className="font-semibold text-xs text-slate-200">
                  Sincronización programada a las <span className="text-indigo-300 font-mono-numbers">{settings.syncTime || '06:00'} hs</span> (1 vez al día)
                </p>
                <p className="text-[11px] text-slate-400">
                  Verificación horaria automática con bloqueo de duplicados diarios. Ventana de detección: 48hs.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Activo
            </span>
          </div>
        </div>

        {/* Respaldo y Restauración de Configuración (Exportar / Importar) */}
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08] flex flex-col gap-5">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-100 text-lg">
                Respaldo de Configuración (Exportar / Importar)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Descarga una copia de seguridad con todos tus canales, listas, reglas y preferencias, o restáurala cuando lo necesites.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Exportar */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Download className="h-4 w-4 text-emerald-400" />
                  Exportar configuración
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Guarda un archivo <code className="text-emerald-300">.json</code> en tu dispositivo con tus canales monitoreados, listas de reproducción y todas las reglas configuradas.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleExportBackup}
                disabled={isExporting}
                variant="outline"
                className="w-full border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-semibold cursor-pointer"
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Descargar respaldo (.json)
              </Button>
            </div>

            {/* Importar */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Upload className="h-4 w-4 text-indigo-400" />
                  Importar configuración
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Restaura tu configuración desde un archivo <code className="text-indigo-300">.json</code> previamente exportado si cambiaste o reiniciaste la base de datos.
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  variant="outline"
                  className="w-full border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-semibold cursor-pointer"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Seleccionar archivo (.json)
                </Button>
              </div>
            </div>
          </div>

          {/* Vista previa de archivo a importar */}
          {backupPreview && (
            <div className="p-4 rounded-xl bg-indigo-500/[0.07] border border-indigo-500/25 flex flex-col gap-4 animate-pop-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <FileJson className="h-5 w-5 text-indigo-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100">
                      Archivo listo para restaurar: <span className="text-indigo-300">{backupPreview.fileName}</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Exportado el {new Date(backupPreview.exportedAt).toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBackupPreview(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-mono-numbers">
                  {backupPreview.channelsCount} canales
                </Badge>
                <Badge variant="outline" className="border-pink-500/30 bg-pink-500/10 text-pink-300 font-mono-numbers">
                  {backupPreview.playlistsCount} listas
                </Badge>
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 font-mono-numbers">
                  {backupPreview.rulesCount} reglas
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    importMode === 'merge'
                      ? 'border-indigo-500/50 bg-indigo-500/15 text-slate-100'
                      : 'border-white/[0.08] bg-black/20 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <p className="text-xs font-semibold">Combinar con datos actuales (Recomendado)</p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    Agrega canales, listas y reglas del archivo sin borrar los existentes.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    importMode === 'replace'
                      ? 'border-amber-500/50 bg-amber-500/15 text-slate-100'
                      : 'border-white/[0.08] bg-black/20 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <p className="text-xs font-semibold">Reemplazar toda la configuración</p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    Limpia la configuración actual y deja únicamente lo que está en el archivo.
                  </p>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBackupPreview(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
                >
                  {isImporting ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                  )}
                  Confirmar e Importar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Conexión con YouTube */}
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08] flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
            <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-100 text-lg">
                Conexión con YouTube
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Estado de la integración OAuth y permisos de gestión de listas.
              </p>
            </div>
          </div>

          {settings.tokenStatus?.valid ? (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-slate-200">Cuenta de Google vinculada</p>
                  <p className="text-xs text-slate-400">Permisos para modificar listas de reproducción concedidos.</p>
                </div>
              </div>
              <span className="text-xs font-medium text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                Conectado
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-slate-200">Sesión de Google expirada</p>
                    <p className="text-xs text-slate-400">
                      Tu token de acceso fue revocado o expiró. Cerrá sesión y volvé a iniciar sesión para reconectar.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 shrink-0">
                  Desconectado
                </span>
              </div>
              <Button
                onClick={() => signOut({ callbackUrl: '/login' })}
                variant="outline"
                className="self-start border-amber-500/30 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión y reconectar
              </Button>
            </div>
          )}
        </div>

        {/* Notificaciones */}
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08] flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-100 text-lg">
                Notificaciones y Alertas
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Recibe avisos cuando se detecten videos o si ocurre algún error de sincronización.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-semibold text-sm text-slate-200">Alertas de error en sincronización</p>
              <p className="text-xs text-slate-400">Notificar si algún canal no puede ser accedido o si la cuota de YouTube se agota.</p>
            </div>
            <Switch
              checked={settings.notificationsEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, notificationsEnabled: checked })}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
        </div>
      </form>
    </div>
  )
}

