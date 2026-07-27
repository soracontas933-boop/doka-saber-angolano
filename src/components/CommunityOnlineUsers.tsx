import { motion } from "framer-motion";
import { MessageCircle, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface OnlineUser {
  id: string;
  name: string;
  avatar?: string;
  status: "online" | "away";
}

interface CommunityOnlineUsersProps {
  users: OnlineUser[];
  onMessage?: (userId: string) => void;
}

export default function CommunityOnlineUsers({
  users,
  onMessage,
}: CommunityOnlineUsersProps) {
  return (
    <Card className="border-border/40 shadow-sm hover:shadow-md transition-all duration-300 bg-background/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UsersIcon className="w-4 h-4 text-primary" />
          Online agora
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {users.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Ninguém online no momento
          </p>
        ) : (
          users.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative">
                  <Avatar className="h-8 w-8 ring-1 ring-primary/10">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-background ${
                      user.status === "online"
                        ? "bg-green-500"
                        : "bg-yellow-500"
                    }`}
                  />
                </div>
                <span className="text-sm font-medium truncate">
                  {user.name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors opacity-0 group-hover:opacity-100"
                onClick={() => onMessage?.(user.id)}
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
