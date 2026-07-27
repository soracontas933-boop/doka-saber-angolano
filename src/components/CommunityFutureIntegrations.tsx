import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CommunityFutureIntegrations() {
  const upcomingFeatures = ["Chat", "Jogos", "Eventos", "IA"];

  return (
    <Card className="border-dashed border-2 border-border/40 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 bg-background/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground">
              Próximas funcionalidades
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {upcomingFeatures.map((feature) => (
              <Badge
                key={feature}
                variant="outline"
                className="text-xs border-primary/30 text-primary/70 hover:border-primary/50 hover:text-primary transition-colors"
              >
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
