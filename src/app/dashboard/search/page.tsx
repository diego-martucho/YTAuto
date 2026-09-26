import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SearchPage() {
  return (
    <div className="flex flex-col gap-6 animate-pop-in">
      <div>
        <h1 className="text-3xl font-display font-black tracking-tight text-slate-100">
          Búsqueda de Videos
        </h1>
        <p className="text-slate-400 text-sm sm:text-base mt-1">
          Busca videos o canales directamente en YouTube para agregarlos a tus listas.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-4 sm:p-6 border border-white/[0.08]">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar por título, canal o término en YouTube..."
              className="pl-10"
            />
          </div>
          <Button className="gap-2 sm:w-auto w-full">
            <Search className="h-4 w-4" />
            <span>Buscar</span>
          </Button>
        </div>
      </div>

      <div className="glass-card flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-700/60">
        <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
          <Sparkles className="h-7 w-7 opacity-80" />
        </div>
        <h3 className="font-display font-semibold text-slate-200 text-base mb-1">
          Comienza una búsqueda
        </h3>
        <p className="text-sm text-slate-400 max-w-sm">
          Introduce un término o pega un enlace de YouTube arriba para explorar y enrutar videos manualmente.
        </p>
      </div>
    </div>
  );
}
