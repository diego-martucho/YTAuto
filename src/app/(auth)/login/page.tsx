import { Play, Sparkles, Filter, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden bg-[#090d16]">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[300px] h-[300px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Brand Header */}
      <div className="relative z-10 mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 ring-1 ring-white/20">
            <Play className="h-6 w-6 text-white fill-white ml-0.5" />
          </div>
          <h1 className="text-4xl font-display font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-indigo-100 to-white">
            YTAuto
          </h1>
        </div>
        <p className="text-slate-400 text-base max-w-sm">
          Automatiza y organiza tus listas de reproducción de YouTube de forma inteligente
        </p>
      </div>

      {/* Sign in Card */}
      <Card className="relative z-10 w-full max-w-md border-white/10 shadow-2xl p-2 sm:p-4 backdrop-blur-xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold font-display text-slate-100">
            Bienvenido de nuevo
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            Inicia sesión para gestionar tus canales, reglas y automatizaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <Button
              type="submit"
              size="lg"
              className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar con Google</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Feature cards */}
      <div className="relative z-10 mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-4xl w-full px-2">
        <div className="glass-card-interactive rounded-2xl p-5 flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
          <div className="rounded-xl bg-indigo-500/15 border border-indigo-500/30 p-2.5 text-indigo-400">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-100 text-base">Sincronización diaria</h3>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              Mantén tus listas de reproducción actualizadas automáticamente todos los días.
            </p>
          </div>
        </div>

        <div className="glass-card-interactive rounded-2xl p-5 flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
          <div className="rounded-xl bg-violet-500/15 border border-violet-500/30 p-2.5 text-violet-400">
            <Filter className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-100 text-base">Filtrado inteligente</h3>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              Enruta videos a tus listas según palabras clave, duración y canales definidos.
            </p>
          </div>
        </div>

        <div className="glass-card-interactive rounded-2xl p-5 flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
          <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-2.5 text-emerald-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-100 text-base">Cero trabajo manual</h3>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              Configúralo una sola vez y deja que YTAuto gestione tu biblioteca en segundo plano.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
