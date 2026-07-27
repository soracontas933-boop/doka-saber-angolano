import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CommunityFutureIntegrations() {
  const upcomingFeatures = ["Chat", "Jogos", "Eventos", "IA"];

  return (
    <Card className="border-dashed border-2 border-border/40 shadow-sm bg-background/50">
      <CardContent className="p-4">
        <div className="text-center">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Próximas funcionalidades
          </p>
          <div className="flex flex-wrap gap-1 justify-center">
            {upcomingFeatures.map((feature) => (
              <Badge key={feature} variant="outline" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
