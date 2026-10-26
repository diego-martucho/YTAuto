import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar, MobileTopBar } from "@/components/layout/app-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    // La barra lateral arranca siempre contraída (modo íconos) en escritorio.
    <SidebarProvider defaultOpen={false}>
      <div className="flex h-dvh w-full overflow-hidden bg-[#090d16] text-slate-100 selection:bg-indigo-500 selection:text-white">
        <AppSidebar user={session.user} />
        <div className="flex flex-1 min-w-0 flex-col h-dvh">
          <MobileTopBar />
          <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:px-8 md:py-6 bg-[#090d16] relative">
            {/* Subtle ambient glow in background */}
            <div className="absolute top-0 right-1/4 w-[450px] max-w-full h-[350px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="relative z-10 max-w-7xl mx-auto md:h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
