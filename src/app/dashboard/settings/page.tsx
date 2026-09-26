'use client'

import { useState, useEffect } from 'react'
import {
  Clock,
  Shield,
  Bell,
  CheckCircle2,
  Loader2,
  Save,
  Globe,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

interface SettingsData {
  id?: string
  timezone: string
  syncTime: string
  notificationsEnabled: boolean
  notificationEmail?: string | null
}

const timezones = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'America/Santiago', label: 'Santiago de Chile (GMT-3/4)' },
  { value: 'America/Bogota', label: 'Bogotá / Lima (GMT-5)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/Madrid', label: 'Madrid / España (GMT+1/2)' },
  { value: 'America/New_York', label: 'Nueva York (GMT-4/5)' },
  { value: 'UTC', label: 'UTC' },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    timezone: 'America/Argentina/Buenos_Aires',
    syncTime: '00:00',
    notificationsEnabled: true,
    notificationEmail: '',
  })
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

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
    } catch (error) {
      toast.error('No se pudo guardar la configuración')
    } finally {
      setIsSaving(false)
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
            Administra las opciones de sincronización automática y preferencias de tu cuenta.
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
                Horario de Ejecución de la App
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Define la hora del día en la que YTAuto recopila los videos de tus canales y aplica las reglas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
            {/* Hora de sincronización */}
            <div className="space-y-2">
              <Label htmlFor="syncTime" className="text-slate-300 text-sm font-medium flex items-center justify-between">
                <span>Hora de ejecución diaria</span>
                <span className="text-xs text-indigo-400 font-mono-numbers">{settings.syncTime} hs</span>
              </Label>
              <div className="relative">
                <Input
                  id="syncTime"
                  type="time"
                  value={settings.syncTime}
                  onChange={(e) => setSettings({ ...settings, syncTime: e.target.value })}
                  className="h-10 bg-black/30 border-white/[0.08] text-slate-100 focus-visible:ring-indigo-500/40 text-sm font-mono-numbers px-3"
                />
              </div>
              <p className="text-xs text-slate-500">
                A esta hora se ejecutará la revisión automática de los canales monitorizados.
              </p>
            </div>

            {/* Zona horaria */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm font-medium flex items-center justify-between">
                <span>Zona horaria</span>
                <Globe className="h-3.5 w-3.5 text-slate-500" />
              </Label>
              <Select
                value={settings.timezone}
                onValueChange={(val) => val && setSettings({ ...settings, timezone: val })}
              >
                <SelectTrigger className="w-full h-10 bg-black/30 border-white/[0.08] text-slate-100 text-xs">
                  <SelectValue placeholder="Selecciona zona horaria" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1523] border-white/[0.08] text-slate-200">
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Determina la referencia horaria para el reloj de ejecución diario.
              </p>
            </div>
          </div>

          <div className="mt-2 pt-4 border-t border-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <div>
                <p className="font-semibold text-xs text-slate-200">Sincronización diaria activa</p>
                <p className="text-[11px] text-slate-400">Escaneo programado cada 24 horas.</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Activo
            </span>
          </div>
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
