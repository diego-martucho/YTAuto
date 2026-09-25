import { Card } from "@/components/ui/card";
import { ListMusic } from "lucide-react";

export default function PlaylistsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Playlists</h1>
        <p className="text-muted-foreground">Your target playlists.</p>
      </div>

      <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
        <ListMusic className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
        <p className="text-muted-foreground">No playlists configured yet.</p>
      </Card>
    </div>
  );
}
