import { useState } from "react";
import { motion } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Share2,
  Image as ImageIcon,
  Video,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Post {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  media_type?: "image" | "video";
  media_url?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

interface CommunityFeedProps {
  posts: Post[];
  loading: boolean;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onCreatePost?: () => void;
  userAvatar?: string;
  userEmail?: string;
}

export default function CommunityFeed({
  posts,
  loading,
  onLike,
  onComment,
  onShare,
  onCreatePost,
  userAvatar,
  userEmail,
}: CommunityFeedProps) {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const handleLike = (postId: string) => {
    setLikedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
    onLike?.(postId);
  };

  const handleComment = (postId: string) => {
    toast.info("Comentários disponíveis em breve");
    onComment?.(postId);
  };

  const handleShare = (postId: string) => {
    toast.success("Compartilhado!");
    onShare?.(postId);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Post Card */}
      <Card className="border-border/40 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userAvatar} />
              <AvatarFallback>
                {userEmail?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-3">
                O que está na tua mente?
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={onCreatePost}
                  disabled
                >
                  <ImageIcon className="w-4 h-4" />
                  Imagem
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={onCreatePost}
                  disabled
                >
                  <Video className="w-4 h-4" />
                  Vídeo (até 15s)
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts */}
      {posts.length === 0 ? (
        <Card className="border-border/40 shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              Nenhuma postagem ainda. Começa a seguir utilizadores para ver as suas postagens!
            </p>
          </CardContent>
        </Card>
      ) : (
        posts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="border-border/40 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.user_avatar} />
                    <AvatarFallback>
                      {post.user_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">
                      {post.user_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString(
                        "pt-PT"
                      )}
                    </p>
                  </div>
                </div>

                <p className="text-sm mb-3 text-foreground/90">
                  {post.content}
                </p>

                {post.media_url && (
                  <div className="mb-3 rounded-lg overflow-hidden bg-secondary h-48">
                    {post.media_type === "image" ? (
                      <img
                        src={post.media_url}
                        alt="Post media"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={post.media_url}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/20">
                  <span>{post.likes_count} gostos</span>
                  <span>{post.comments_count} comentários</span>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-border/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex-1 gap-2 ${
                      likedPosts.has(post.id)
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                    onClick={() => handleLike(post.id)}
                  >
                    <Heart
                      className="w-4 h-4"
                      fill={likedPosts.has(post.id) ? "currentColor" : "none"}
                    />
                    Gosto
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 gap-2 text-muted-foreground hover:text-primary"
                    onClick={() => handleComment(post.id)}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Comentar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 gap-2 text-muted-foreground hover:text-primary"
                    onClick={() => handleShare(post.id)}
                  >
                    <Share2 className="w-4 h-4" />
                    Partilhar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))
      )}
    </div>
  );
}
