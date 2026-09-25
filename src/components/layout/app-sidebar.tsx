"use client";

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

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Channels", href: "/dashboard/channels", icon: Radio },
  { name: "Playlists", href: "/dashboard/playlists", icon: ListMusic },
  { name: "Rules", href: "/dashboard/rules", icon: GitBranch },
  { name: "Search", href: "/dashboard/search", icon: Search },
  { name: "Logs", href: "/dashboard/logs", icon: ScrollText },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function AppSidebar({ user }: { user: any }) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border/50 py-4">
        <Link href="/dashboard" className="flex items-center gap-2 px-4 text-primary">
          <Play className="h-6 w-6 fill-current" />
          <span className="text-xl font-bold tracking-tight">YTAuto</span>
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="py-4">
        <SidebarMenu>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border/50">
            <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
            <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-sm font-medium truncate">{user?.name}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-4 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
