import { Card } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your sync preferences.</p>
      </div>

      <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
        <Settings className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
        <p className="text-muted-foreground">Settings options coming soon.</p>
      </Card>
    </div>
  );
}
