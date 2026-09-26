"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  ListMusic,
  GitBranch,
  Search,
  ScrollText,
  Settings,
  Play,
  LogOut,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "next-auth/react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const navigation = [
  { name: "Panel de Control", href: "/dashboard", icon: LayoutDashboard },
  { name: "Canales", href: "/dashboard/channels", icon: Radio },
  { name: "Listas de Reproducción", href: "/dashboard/playlists", icon: ListMusic },
  { name: "Reglas", href: "/dashboard/rules", icon: GitBranch },
  { name: "Búsqueda", href: "/dashboard/search", icon: Search },
  { name: "Registros", href: "/dashboard/logs", icon: ScrollText },
  { name: "Configuración", href: "/dashboard/settings", icon: Settings },
];

interface SidebarUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function AppSidebar({ user }: { user?: SidebarUser | null }) {
  const pathname = usePathname();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Error signing out:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <Sidebar className="border-r border-slate-800/80 bg-[#090d16]">
      <SidebarHeader className="border-b border-slate-800/80 py-4 px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-600/30 ring-1 ring-white/20 group-hover:scale-105 transition-transform">
            <Play className="h-4 w-4 text-white fill-white ml-0.5" />
          </div>
          <span className="text-xl font-display font-black tracking-tight text-indigo-400 group-hover:text-indigo-300 transition-colors">
            YTAuto
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-4 px-2">
        <SidebarMenu className="gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <SidebarMenuItem key={item.name}>
                <Link href={item.href} className="w-full">
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.name}
                    className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm shadow-indigo-600/20 font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                    <span>{item.name}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-800/80 p-3 bg-slate-900/30">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/70 border border-slate-800/80">
          <Avatar className="h-9 w-9 border border-slate-700/60 shrink-0">
            <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
            <AvatarFallback className="bg-indigo-950 text-indigo-300 font-bold">
              {user?.name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-sm font-semibold text-slate-200 truncate">{user?.name || "Usuario"}</span>
            <span className="text-xs text-slate-400 truncate">{user?.email || ""}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar sesión</span>
        </button>

        <ConfirmDialog
          open={showLogoutConfirm}
          onOpenChange={setShowLogoutConfirm}
          title="¿Cerrar sesión?"
          description="¿Estás seguro de que deseas salir de tu cuenta? Tendrás que iniciar sesión nuevamente para acceder a tu panel de control."
          confirmText="Cerrar sesión"
          cancelText="Cancelar"
          variant="destructive"
          isLoading={isLoggingOut}
          onConfirm={handleLogout}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
