import { Card } from "@/components/ui/card";
import { GitBranch } from "lucide-react";

export default function RulesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rules</h1>
        <p className="text-muted-foreground">Configure what videos go where.</p>
      </div>

      <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
        <GitBranch className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
        <p className="text-muted-foreground">No rules created yet.</p>
      </Card>
    </div>
  );
}
