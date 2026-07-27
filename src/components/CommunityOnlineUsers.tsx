import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
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
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Online agora</CardTitle>
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
              className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>
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
                className="h-7 w-7 text-muted-foreground hover:text-primary"
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
