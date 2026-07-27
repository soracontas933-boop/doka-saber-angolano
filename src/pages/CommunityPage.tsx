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
  Zap,
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
import CommunityFeed from "@/components/CommunityFeed";
import CommunityOnlineUsers from "@/components/CommunityOnlineUsers";
import CommunitySuggestedUsers from "@/components/CommunitySuggestedUsers";
import CommunitySuggestedGroups from "@/components/CommunitySuggestedGroups";
import CommunityFutureIntegrations from "@/components/CommunityFutureIntegrations";

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      {/* Header com design minimalista */}
      <div className="container mx-auto px-4 md:px-6 max-w-7xl pt-4 md:pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 backdrop-blur-sm">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Comunidade
              </h1>
              <p className="text-sm text-muted-foreground">
                Conecta-te com outros utilizadores, partilha conhecimento e colabora
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search Bar */}
      <div className="container mx-auto px-4 md:px-6 max-w-7xl pb-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Procura utilizadores, grupos ou tópicos..."
              className="pl-10 bg-background border-border/40 hover:border-border/60 focus-visible:border-primary/50 transition-colors shadow-sm"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-6 max-w-7xl pb-20 md:pb-6">
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center py-20"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Carregando comunidade...
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Feed - Left Column */}
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="lg:col-span-2 space-y-4"
            >
              {/* Create Post Card com design minimalista */}
              <Card className="border-border/40 shadow-sm hover:shadow-md transition-all duration-300 bg-background/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {user?.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground font-medium mb-3">
                        O que está na tua mente?
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-xs border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                          disabled
                        >
                          <ImageIcon className="w-4 h-4" />
                          Imagem
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-xs border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-colors"
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
                <TabsList className="grid w-full grid-cols-3 bg-background border border-border/40 shadow-sm">
                  <TabsTrigger value="para-voce" className="text-xs md:text-sm">
                    Para ti
                  </TabsTrigger>
                  <TabsTrigger value="seguindo" className="text-xs md:text-sm">
                    Seguindo
                  </TabsTrigger>
                  <TabsTrigger value="tendencias" className="text-xs md:text-sm">
                    Tendências
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="para-voce" className="space-y-4 mt-4">
                  <CommunityFeed
                    posts={posts}
                    loading={false}
                    onLike={handleLike}
                    onComment={handleComment}
                    onShare={handleShare}
                    userAvatar={user?.user_metadata?.avatar_url}
                    userEmail={user?.email}
                  />
                </TabsContent>

                <TabsContent value="seguindo" className="space-y-4 mt-4">
                  <Card className="border-border/40 shadow-sm bg-background/50 backdrop-blur-sm">
                    <CardContent className="p-8 text-center">
                      <div className="space-y-2">
                        <Users className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                        <p className="text-sm text-muted-foreground">
                          Começa a seguir utilizadores para ver as suas postagens aqui
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tendencias" className="space-y-4 mt-4">
                  <Card className="border-border/40 shadow-sm bg-background/50 backdrop-blur-sm">
                    <CardContent className="p-8 text-center">
                      <div className="space-y-2">
                        <Zap className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                        <p className="text-sm text-muted-foreground">
                          As tendências aparecerão aqui em breve
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>

            {/* Sidebar - Right Column */}
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="space-y-4"
            >
              {/* Online Users */}
              <CommunityOnlineUsers
                users={onlineUsers}
                onMessage={(userId) =>
                  toast.info("Chat disponível em breve para " + userId)
                }
              />

              {/* Suggested Users */}
              <CommunitySuggestedUsers users={suggestedUsers} />

              {/* Suggested Groups */}
              <CommunitySuggestedGroups groups={suggestedGroups} />

              {/* Future Integrations */}
              <CommunityFutureIntegrations />
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
