"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  ListMusic,
  GitBranch,
  ScrollText,
  Settings,
  Play,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { signOut } from "next-auth/react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const navigation = [
  { name: "Panel de Control", href: "/dashboard", icon: LayoutDashboard },
  { name: "Canales", href: "/dashboard/channels", icon: Radio },
  { name: "Listas de Reproducción", href: "/dashboard/playlists", icon: ListMusic },
  { name: "Reglas", href: "/dashboard/rules", icon: GitBranch },
  { name: "Registros", href: "/dashboard/logs", icon: ScrollText },
  { name: "Configuración", href: "/dashboard/settings", icon: Settings },
];

interface SidebarUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

function BrandLogo({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "w-7 h-7 rounded-lg" : "w-8 h-8 rounded-xl";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div
      className={`${box} shrink-0 bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-600/30 ring-1 ring-white/20 group-hover:scale-105 transition-transform`}
    >
      <Play className={`${icon} text-white fill-white ml-0.5`} />
    </div>
  );
}

/** Barra superior visible solo en mobile, con el botón para abrir el menú lateral. */
export function MobileTopBar() {
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const current = navigation.find((n) => n.href === pathname);

  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-3 border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-md shrink-0">
      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 border border-slate-800/80 cursor-pointer"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Link href="/dashboard" className="flex items-center gap-2 group min-w-0">
        <BrandLogo size="sm" />
        <span className="text-lg font-display font-black tracking-tight text-indigo-400">YTAuto</span>
      </Link>
      {current && current.href !== "/dashboard" && (
        <span className="ml-auto text-xs font-medium text-slate-400 truncate">{current.name}</span>
      )}
    </header>
  );
}

export function AppSidebar({ user }: { user?: SidebarUser | null }) {
  const pathname = usePathname();
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const collapsed = state === "collapsed" && !isMobile;

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
    <Sidebar collapsible="icon" className="border-r border-slate-800/80 bg-[#090d16]">
      <SidebarHeader className="border-b border-slate-800/80 h-16 justify-center px-4 group-data-[collapsible=icon]:px-2">
        <Link
          href="/dashboard"
          onClick={() => isMobile && setOpenMobile(false)}
          className="flex items-center gap-2.5 group overflow-hidden"
        >
          <BrandLogo />
          <span className="text-xl font-display font-black tracking-tight text-indigo-400 group-hover:text-indigo-300 transition-colors group-data-[collapsible=icon]:hidden">
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
                <SidebarMenuButton
                  isActive={isActive}
                  tooltip={item.name}
                  render={
                    <Link
                      href={item.href}
                      onClick={() => isMobile && setOpenMobile(false)}
                    />
                  }
                  className={`rounded-xl px-3 h-10 text-sm font-medium transition-all border ${
                    isActive
                      ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/30 shadow-sm shadow-indigo-600/20 font-semibold"
                      : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-800/80 p-3 bg-slate-900/30 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:items-center">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="cursor-default">
                  <Avatar className="h-8 w-8 border border-slate-700/60 shrink-0">
                    <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                    <AvatarFallback className="bg-indigo-950 text-indigo-300 font-bold text-xs">
                      {user?.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              }
            />
            <TooltipContent side="right">
              {user?.name || "Usuario"}
              {user?.email ? ` · ${user.email}` : ""}
            </TooltipContent>
          </Tooltip>
        ) : (
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
        )}

        <div className="flex gap-1.5 group-data-[collapsible=icon]:flex-col">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:flex-none"
                  aria-label="Cerrar sesión"
                />
              }
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">Cerrar sesión</span>
            </TooltipTrigger>
            <TooltipContent side="right" hidden={!collapsed}>
              Cerrar sesión
            </TooltipContent>
          </Tooltip>

          {!isMobile && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    className="flex items-center justify-center rounded-xl size-8 shrink-0 self-center text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 transition-all cursor-pointer"
                    aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
                  />
                }
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </TooltipTrigger>
              <TooltipContent side="right">
                {collapsed ? "Expandir (Ctrl+B)" : "Contraer (Ctrl+B)"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

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
      <SidebarRail />
    </Sidebar>
  );
}
