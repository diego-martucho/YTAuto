import { Play, Sparkles, Filter, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-primary">
          <Play className="h-10 w-10 fill-current" />
          <h1 className="text-4xl font-bold tracking-tight">YTAuto</h1>
        </div>
        <p className="text-muted-foreground text-lg">Automate your YouTube playlists</p>
      </div>

      <Card className="w-full max-w-sm border-border/50 shadow-2xl bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to manage your automation rules</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <Button type="submit" className="w-full" size="lg">
              Sign in with Google
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3 max-w-3xl w-full px-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <Zap className="h-6 w-6" />
          </div>
          <h3 className="font-semibold">Auto-sync daily</h3>
          <p className="text-sm text-muted-foreground">Keep your playlists updated automatically every day.</p>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <Filter className="h-6 w-6" />
          </div>
          <h3 className="font-semibold">Smart filtering</h3>
          <p className="text-sm text-muted-foreground">Route videos to playlists based on keywords and duration.</p>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="font-semibold">Zero manual work</h3>
          <p className="text-sm text-muted-foreground">Set it up once and let YTAuto handle the rest.</p>
        </div>
      </div>
    </div>
  );
}
