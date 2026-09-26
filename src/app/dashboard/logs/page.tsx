import { ScrollText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LogsPage() {
  return (
    <div className="flex flex-col gap-6 animate-pop-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight text-slate-100">
            Registros de Sincronización
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-1">
            Historial de ejecuciones automáticas, videos procesados y eventos del sistema.
          </p>
        </div>
        <Button variant="outline" className="w-fit gap-2">
          <RotateCcw className="h-4 w-4" />
          <span>Actualizar</span>
        </Button>
      </div>

      <div className="glass-card flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-700/60">
        <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
          <ScrollText className="h-7 w-7 opacity-80" />
        </div>
        <h3 className="font-display font-semibold text-slate-200 text-base mb-1">
          No hay registros todavía
        </h3>
        <p className="text-sm text-slate-400 max-w-sm">
          Cuando el sistema ejecute la sincronización diaria o procese nuevas reglas, podrás ver los detalles de cada evento aquí.
        </p>
      </div>
    </div>
  );
}
