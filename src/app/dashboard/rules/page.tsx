import { GitBranch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RulesPage() {
  return (
    <div className="flex flex-col gap-6 animate-pop-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight text-slate-100">
            Reglas de Automatización
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-1">
            Define las condiciones para enrutar videos automáticamente hacia tus listas de reproducción.
          </p>
        </div>
        <Button className="w-fit gap-2">
          <Plus className="h-4 w-4" />
          <span>Crear regla</span>
        </Button>
      </div>

      <div className="glass-card flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-700/60">
        <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
          <GitBranch className="h-7 w-7 opacity-80" />
        </div>
        <h3 className="font-display font-semibold text-slate-200 text-base mb-1">
          Aún no tienes reglas creadas
        </h3>
        <p className="text-sm text-slate-400 max-w-sm mb-4">
          Crea tu primera regla para filtrar videos por título, duración o canal y guardarlos en tus listas.
        </p>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span>Crear primera regla</span>
        </Button>
      </div>
    </div>
  );
}
