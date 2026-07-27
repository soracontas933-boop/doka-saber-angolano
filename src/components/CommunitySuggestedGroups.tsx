import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SuggestedGroup {
  id: string;
  name: string;
  members_count: number;
  description: string;
}

interface CommunitySuggestedGroupsProps {
  groups: SuggestedGroup[];
  onJoin?: (groupId: string) => void;
}

export default function CommunitySuggestedGroups({
  groups,
  onJoin,
}: CommunitySuggestedGroupsProps) {
  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Grupos sugeridos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {groups.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhum grupo sugerido no momento
          </p>
        ) : (
          groups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-2 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {group.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {group.members_count} membros
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {group.description}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs mt-2"
                onClick={() => onJoin?.(group.id)}
                disabled
              >
                Juntar
              </Button>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
