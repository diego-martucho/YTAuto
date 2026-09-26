import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";

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
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[#090d16] text-slate-100 selection:bg-indigo-500 selection:text-white">
        <AppSidebar user={session.user} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#090d16] relative">
          {/* Subtle ambient glow in background */}
          <div className="absolute top-0 right-1/4 w-[450px] h-[350px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="relative z-10 max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
