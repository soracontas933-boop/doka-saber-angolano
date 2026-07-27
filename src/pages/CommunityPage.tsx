import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  Loader2,
  MessageCircle,
  Heart,
  Share2,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface CommunityPost {
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

interface OnlineUser {
  id: string;
  name: string;
  avatar?: string;
  status: "online" | "away";
}

interface SuggestedUser {
  id: string;
  name: string;
  avatar?: string;
  mutual_friends: number;
}

interface SuggestedGroup {
  id: string;
  name: string;
  members_count: number;
  description: string;
}

export default function CommunityPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [suggestedGroups, setSuggestedGroups] = useState<SuggestedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("para-voce");

  useEffect(() => {
    fetchCommunityData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchCommunityData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch posts (placeholder - será implementado na próxima etapa)
      setPosts([
        {
          id: "1",
          user_id: "user1",
          user_name: "João Silva",
          content: "Acabei de terminar o resumo de História! Quem quer colaborar?",
          created_at: new Date().toISOString(),
          likes_count: 12,
          comments_count: 3,
          is_liked: false,
        },
        {
          id: "2",
          user_id: "user2",
          user_name: "Maria Santos",
          content: "Alguém quer jogar um quiz de Matemática comigo?",
          created_at: new Date().toISOString(),
          likes_count: 8,
          comments_count: 5,
          is_liked: false,
        },
      ]);

      // Fetch online users (placeholder)
      setOnlineUsers([
        { id: "1", name: "João Silva", status: "online" },
        { id: "2", name: "Maria Santos", status: "online" },
        { id: "3", name: "Carlos Oliveira", status: "away" },
        { id: "4", name: "Ana Costa", status: "online" },
      ]);

      // Fetch suggested users (placeholder)
      setSuggestedUsers([
        { id: "1", name: "Pedro Rocha", avatar: undefined, mutual_friends: 3 },
        { id: "2", name: "Sofia Martins", avatar: undefined, mutual_friends: 2 },
        { id: "3", name: "Lucas Ferreira", avatar: undefined, mutual_friends: 1 },
      ]);

      // Fetch suggested groups (placeholder)
      setSuggestedGroups([
        {
          id: "1",
          name: "Estudantes de Programação",
          members_count: 245,
          description: "Comunidade para aprender programação juntos",
        },
        {
          id: "2",
          name: "Amigos de Física",
          members_count: 128,
          description: "Discussões e dúvidas sobre Física",
        },
        {
          id: "3",
          name: "Leitores de Literatura",
          members_count: 89,
          description: "Compartilha livros e análises literárias",
        },
      ]);
    } catch (error) {
      console.error("Erro ao carregar dados da comunidade:", error);
      toast.error("Erro ao carregar dados da comunidade");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Implementar busca na próxima etapa
  };

  const handleLike = (postId: string) => {
    // Implementar like na próxima etapa
    toast.success("Like adicionado!");
  };

  const handleComment = (postId: string) => {
    // Implementar comentário na próxima etapa
    toast.info("Comentários disponíveis em breve");
  };

  const handleShare = (postId: string) => {
    // Implementar compartilhamento na próxima etapa
    toast.success("Compartilhado!");
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl pb-20 md:pb-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 mb-2">
          <Users className="w-6 h-6 text-primary" />
          Comunidade
        </h1>
        <p className="text-sm text-muted-foreground">
          Conecta-te com outros utilizadores, partilha conhecimento e colabora em projetos
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Procura utilizadores, grupos ou tópicos..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed - Left Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Create Post Card */}
            <Card className="border-border/40 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback>
                      {user?.email?.charAt(0).toUpperCase()}
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
                        disabled
                      >
                        <ImageIcon className="w-4 h-4" />
                        Imagem
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
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

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-background border border-border/40">
                <TabsTrigger value="para-voce">Para ti</TabsTrigger>
                <TabsTrigger value="seguindo">Seguindo</TabsTrigger>
                <TabsTrigger value="tendencias">Tendências</TabsTrigger>
              </TabsList>

              <TabsContent value="para-voce" className="space-y-4 mt-4">
                {posts.map((post, index) => (
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
                            className="flex-1 gap-2 text-muted-foreground hover:text-primary"
                            onClick={() => handleLike(post.id)}
                          >
                            <Heart className="w-4 h-4" />
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
                ))}
              </TabsContent>

              <TabsContent value="seguindo" className="space-y-4 mt-4">
                <Card className="border-border/40 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">
                      Começa a seguir utilizadores para ver as suas postagens aqui
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tendencias" className="space-y-4 mt-4">
                <Card className="border-border/40 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">
                      As tendências aparecerão aqui em breve
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-4">
            {/* Online Users */}
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Online agora</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {onlineUsers.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
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
                      className="h-7 w-7 text-muted-foreground"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* Suggested Users */}
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sugestões de utilizadores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestedUsers.map((suggestedUser) => (
                  <motion.div
                    key={suggestedUser.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {suggestedUser.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {suggestedUser.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {suggestedUser.mutual_friends} amigos em comum
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled
                    >
                      Seguir
                    </Button>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* Suggested Groups */}
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Grupos sugeridos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestedGroups.map((group) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
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
                      disabled
                    >
                      Juntar
                    </Button>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* Future Integrations Placeholder */}
            <Card className="border-dashed border-2 border-border/40 shadow-sm bg-background/50">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Próximas funcionalidades
                  </p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    <Badge variant="outline" className="text-xs">
                      Chat
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Jogos
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Eventos
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      IA
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
