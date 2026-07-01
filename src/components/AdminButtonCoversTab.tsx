import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import AdminHeroBackgroundTab from "./AdminHeroBackgroundTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BUTTON_KEYS = [
  { key: "trabalho", label: "Trabalhos" },
  { key: "resumo", label: "Resumos" },
  { key: "questionario", label: "Questionários" },
  { key: "plano-aula", label: "Planos de Aula" },
  { key: "curriculo", label: "Currículo" },
  { key: "meus-projetos", label: "Projetos" },
  { key: "comunidade", label: "Comunidade" },
  { key: "aumentar-saldo", label: "Aumentar Saldo" },
];

interface ButtonCover {
  id: string;
  button_key: string;
  image_url: string;
  label: string | null;
}

const isVideoFile = (filename: string): boolean => {
  const videoExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".flv"];
  return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

const AdminButtonCoversTab = () => {
  const [activeTab, setActiveTab] = useState("covers");
  const [covers, setCovers] = useState<ButtonCover[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchCovers = async () => {
    setLoading(true);
    const { data } = await (supabase.from("button_covers") as any).select("*");
    setCovers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchCovers(); }, []);

  const handleUpload = async (buttonKey: string, file: File) => {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      toast({ title: "Apenas imagens ou vídeos são permitidos", variant: "destructive" });
      return;
    }

    setUploading(buttonKey);
    const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
    const filePath = `covers/${buttonKey}-${Date.now()}.${ext}`;

    // Upload to storage
    const { error: uploadErr } = await supabase.storage
      .from("button-covers")
      .upload(filePath, file, { upsert: true });

    if (uploadErr) {
      toast({ title: "Erro no upload", description: uploadErr.message, variant: "destructive" });
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("button-covers").getPublicUrl(filePath);
    const mediaUrl = urlData.publicUrl;

    // Upsert in button_covers table
    const existing = covers.find(c => c.button_key === buttonKey);
    if (existing) {
      await (supabase.from("button_covers") as any)
        .update({ image_url: mediaUrl, atualizado_em: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await (supabase.from("button_covers") as any)
        .insert({ button_key: buttonKey, image_url: mediaUrl, label: BUTTON_KEYS.find(b => b.key === buttonKey)?.label });
    }

    toast({ title: isVideo ? "Vídeo atualizado!" : "Imagem atualizada!" });
    setUploading(null);
    fetchCovers();
  };

  const handleRemove = async (cover: ButtonCover) => {
    // Extract filename from URL
    const parts = cover.image_url.split("/button-covers/");
    if (parts[1]) {
      await supabase.storage.from("button-covers").remove([decodeURIComponent(parts[1])]);
    }
    await (supabase.from("button_covers") as any).delete().eq("id", cover.id);
    toast({ title: "Mídia removida" });
    fetchCovers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="covers">Capas de Botões</TabsTrigger>
        <TabsTrigger value="hero">Mídia de Fundo</TabsTrigger>
      </TabsList>

      <TabsContent value="covers">
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Capas dos Botões Mobile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Faça upload de imagens ou vídeos em loop para os botões de acção rápida na página inicial mobile.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BUTTON_KEYS.map(({ key, label }) => {
              const cover = covers.find(c => c.button_key === key);
              const isUploading = uploading === key;
              const isVideo = cover && isVideoFile(cover.image_url);

              return (
                <div
                  key={key}
                  className="border border-border rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    {cover && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleRemove(cover)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {cover ? (
                    <div className="relative w-full h-24 rounded-lg overflow-hidden bg-muted group">
                      {isVideo ? (
                        <video
                          src={cover.image_url}
                          className="w-full h-full object-cover"
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                      ) : (
                        <img
                          src={cover.image_url}
                          alt={label}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-24 rounded-lg bg-muted/50 border-2 border-dashed border-border flex items-center justify-center">
                      <p className="text-xs text-muted-foreground">Sem imagem ou vídeo</p>
                    </div>
                  )}

                  <label className="cursor-pointer">
                    <Input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(key, f);
                        e.target.value = "";
                      }}
                      disabled={isUploading}
                    />
                    <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-primary text-sm font-medium">
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {cover ? (isVideo ? "Trocar Vídeo" : "Trocar Imagem") : "Enviar Mídia"}
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
      </TabsContent>

      <TabsContent value="hero">
        <AdminHeroBackgroundTab />
      </TabsContent>
    </Tabs>
  );
};

export default AdminButtonCoversTab;
