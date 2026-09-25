import { Card } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

export default function LogsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sync Logs</h1>
        <p className="text-muted-foreground">History of automated syncs.</p>
      </div>

      <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
        <ScrollText className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
        <p className="text-muted-foreground">No logs available.</p>
      </Card>
    </div>
  );
}
