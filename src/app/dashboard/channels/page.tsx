import { Card } from "@/components/ui/card";
import { Radio } from "lucide-react";

export default function ChannelsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Channels</h1>
        <p className="text-muted-foreground">Manage the YouTube channels you monitor.</p>
      </div>

      <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
        <Radio className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
        <p className="text-muted-foreground">No channels added yet.</p>
      </Card>
    </div>
  );
}
