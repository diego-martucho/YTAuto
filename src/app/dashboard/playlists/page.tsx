import { ListMusic, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlaylistsPage() {
  return (
    <div className="flex flex-col gap-6 animate-pop-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight text-slate-100">
            Listas de Reproducción
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-1">
            Gestiona las listas de YouTube donde se organizarán tus videos clasificados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Sincronizar desde YouTube</span>
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Crear lista</span>
          </Button>
        </div>
      </div>

      <div className="glass-card flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-700/60">
        <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
          <ListMusic className="h-7 w-7 opacity-80" />
        </div>
        <h3 className="font-display font-semibold text-slate-200 text-base mb-1">
          No hay listas de reproducción configuradas
        </h3>
        <p className="text-sm text-slate-400 max-w-sm mb-4">
          Conéctate con tu cuenta de YouTube para importar tus listas existentes o crea una nueva lista de destino.
        </p>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          <span>Sincronizar con YouTube</span>
        </Button>
      </div>
    </div>
  );
}
