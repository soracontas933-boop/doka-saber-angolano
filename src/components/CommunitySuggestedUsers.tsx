import { motion } from "framer-motion";
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
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sugestões de utilizadores</CardTitle>
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
              className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.mutual_friends} amigos em comum
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
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
