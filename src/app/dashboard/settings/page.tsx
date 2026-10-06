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
  AlertTriangle,
  LogOut,
} from 'lucide-react'
import { toast } from 'sonner'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'

interface SettingsData {
  id?: string
  timezone: string
  syncTime: string
  notificationsEnabled: boolean
  notificationEmail?: string | null
  tokenStatus?: { valid: boolean; reason?: string }
}

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
                Sincronización Automática
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                YTAuto revisa automáticamente tus canales y aplica las reglas una vez al día.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-display font-black text-indigo-300 font-mono-numbers">
                06:00
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-200">Hora de Argentina (UTC-3)</p>
                <p className="text-xs text-slate-400">Todos los días a las 09:00 UTC</p>
              </div>
            </div>
            <Globe className="h-5 w-5 text-slate-500" />
          </div>

          <div className="mt-1 pt-4 border-t border-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <div>
                <p className="font-semibold text-xs text-slate-200">Sincronización diaria activa</p>
                <p className="text-[11px] text-slate-400">Escaneo programado cada 24 horas. Ventana de detección: últimas 48hs.</p>
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
