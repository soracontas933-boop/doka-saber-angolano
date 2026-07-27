import { motion } from "framer-motion";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SuggestedUser {
  id: string;
  name: string;
  avatar?: string;
  mutual_friends: number;
}

interface CommunitySuggestedUsersProps {
  users: SuggestedUser[];
  onFollow?: (userId: string) => void;
}

export default function CommunitySuggestedUsers({
  users,
  onFollow,
}: CommunitySuggestedUsersProps) {
  return (
    <Card className="border-border/40 shadow-sm hover:shadow-md transition-all duration-300 bg-background/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          Sugestões
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {users.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhuma sugestão no momento
          </p>
        ) : (
          users.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Avatar className="h-8 w-8 ring-1 ring-primary/10">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.mutual_friends}{" "}
                    {user.mutual_friends === 1 ? "amigo" : "amigos"} em comum
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors opacity-0 group-hover:opacity-100"
                onClick={() => onFollow?.(user.id)}
                disabled
              >
                Seguir
              </Button>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
