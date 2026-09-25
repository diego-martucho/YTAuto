import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";

export default function SearchPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="text-muted-foreground">Find and add videos manually.</p>
      </div>

      <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
        <Search className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
        <p className="text-muted-foreground">Search functionality coming soon.</p>
      </Card>
    </div>
  );
}
