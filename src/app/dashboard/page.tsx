import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio, Video, GitBranch, Clock } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8 animate-pop-in">
      <div>
        <h1 className="text-3xl font-display font-black tracking-tight text-slate-100">
          Panel de Control
        </h1>
        <p className="text-slate-400 text-sm sm:text-base mt-1">
          Resumen general de tu automatización de YouTube.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card-interactive rounded-2xl p-5 border border-white/[0.08] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Canales monitoreados
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Radio className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-display font-black text-slate-100 font-mono-numbers">
            0
          </div>
        </div>

        <div className="glass-card-interactive rounded-2xl p-5 border border-white/[0.08] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Videos añadidos hoy
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Video className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-display font-black text-slate-100 font-mono-numbers">
            0
          </div>
        </div>

        <div className="glass-card-interactive rounded-2xl p-5 border border-white/[0.08] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Reglas activas
            </span>
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <GitBranch className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-display font-black text-slate-100 font-mono-numbers">
            0
          </div>
        </div>

        <div className="glass-card-interactive rounded-2xl p-5 border border-white/[0.08] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Última sincronización
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-display font-bold text-slate-300">
            Nunca
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-display font-bold tracking-tight text-slate-100">
          Actividad reciente
        </h2>
        <div className="glass-card flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-700/60">
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-slate-500 mb-3">
            <Clock className="h-6 w-6 opacity-60" />
          </div>
          <h3 className="font-display font-semibold text-slate-200 text-base mb-1">
            Sin actividad de sincronización
          </h3>
          <p className="text-sm text-slate-400 max-w-md">
            Aún no hay actividad registrada. Agrega canales y configura reglas para comenzar a organizar tus listas de YouTube.
          </p>
        </div>
      </div>
    </div>
  );
}
