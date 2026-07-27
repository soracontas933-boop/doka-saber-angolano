import { motion } from "framer-motion";
import { Users as UsersIcon } from "lucide-react";
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
    <Card className="border-border/40 shadow-sm hover:shadow-md transition-all duration-300 bg-background/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UsersIcon className="w-4 h-4 text-primary" />
          Grupos
        </CardTitle>
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
              className="p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {group.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {group.members_count} {group.members_count === 1 ? "membro" : "membros"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {group.description}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs mt-2 h-7 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors opacity-0 group-hover:opacity-100"
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
