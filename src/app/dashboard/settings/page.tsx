import { Settings, Shield, Bell, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 animate-pop-in">
      <div>
        <h1 className="text-3xl font-display font-black tracking-tight text-slate-100">
          Configuración
        </h1>
        <p className="text-slate-400 text-sm sm:text-base mt-1">
          Administra las opciones de sincronización automática y preferencias de tu cuenta.
        </p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {/* Sincronización Automática */}
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08] flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-100 text-lg">
                Sincronización Automática
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Controla cómo y cuándo se sincronizan los videos de tus canales seguidos.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-2">
            <div className="flex items-center justify-between py-2 border-b border-slate-800/40">
              <div>
                <p className="font-semibold text-sm text-slate-200">Sincronización diaria programada</p>
                <p className="text-xs text-slate-400">Ejecuta el escaneo de canales automáticamente una vez al día.</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Activado
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-semibold text-sm text-slate-200">Intervalo de verificación</p>
                <p className="text-xs text-slate-400">Frecuencia con la que se revisan feeds RSS y canales.</p>
              </div>
              <span className="text-xs font-medium text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 font-mono-numbers">
                Cada 24 horas
              </span>
            </div>
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
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="font-semibold text-sm text-slate-200">Cuenta de Google vinculada</p>
                <p className="text-xs text-slate-400">Permisos para crear y modificar listas de reproducción concedidos.</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Reconectar
            </Button>
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
              <p className="text-xs text-slate-400">Notificar si algún canal no puede ser accedido o si la cuota de la API se excede.</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Activado
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
