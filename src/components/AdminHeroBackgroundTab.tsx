import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, Trash2, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface HeroBackgroundMedia {
  id?: string;
  media_type: "image" | "video" | "carousel";
  media_url?: string;
  carousel_items?: string[];
  auto_play_interval?: number;
  ativo: boolean;
}

const AdminHeroBackgroundTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [media, setMedia] = useState<HeroBackgroundMedia>({
    media_type: "image",
    ativo: true,
  });
  const [newCarouselUrl, setNewCarouselUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("hero_background_media")
      .select("*")
      .eq("ativo", true)
      .single();

    if (data) {
      setMedia(data);
    } else if (error?.code !== "PGRST116") {
      console.error("Erro ao carregar mídia:", error);
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast({ title: "Ficheiro demasiado grande", description: "Máximo 50MB", variant: "destructive" });
        return;
      }
      setFile(selectedFile);
    }
  };

  const uploadFile = async (fileToUpload: File): Promise<string | null> => {
    const ext = fileToUpload.name.split(".").pop();
    const fileName = `hero-bg-${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from("hero-backgrounds")
      .upload(fileName, fileToUpload, { upsert: true });

    if (error) {
      toast({ title: "Erro ao enviar ficheiro", description: error.message, variant: "destructive" });
      return null;
    }

    const { data: urlData } = supabase.storage.from("hero-backgrounds").getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const saveMedia = async () => {
    setSaving(true);

    try {
      let mediaUrl = media.media_url;

      if (file) {
        const uploadedUrl = await uploadFile(file);
        if (!uploadedUrl) {
          setSaving(false);
          return;
        }
        mediaUrl = uploadedUrl;
        setFile(null);
      }

      if (media.media_type === "carousel") {
        if (!media.carousel_items || media.carousel_items.length === 0) {
          toast({ title: "Adicione pelo menos uma imagem ao carrossel", variant: "destructive" });
          setSaving(false);
          return;
        }
      } else if (!file && !mediaUrl) {
        toast({ title: "Forneça uma URL ou faça upload de um ficheiro", variant: "destructive" });
        setSaving(false);
        return;
      }

      const payload = {
        media_type: media.media_type,
        media_url: media.media_type === "carousel" ? (media.carousel_items?.[0] || null) : (mediaUrl || null),
        carousel_items: media.media_type === "carousel" ? media.carousel_items || [] : null,
        auto_play_interval: media.auto_play_interval || 5000,
        ativo: media.ativo,
      };

      let error;
      if (media.id) {
        ({ error } = await supabase.from("hero_background_media").update(payload).eq("id", media.id));
      } else {
        ({ error } = await supabase.from("hero_background_media").insert(payload));
      }

      if (error) {
        console.error("Erro detalhado do Supabase:", error);
        throw error;
      }
      toast({ title: "Mídia de fundo salva com sucesso!" });
      loadMedia();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteMedia = async () => {
    if (!confirm("Tem a certeza que deseja remover a mídia de fundo?")) return;

    const { error } = await supabase.from("hero_background_media").delete().eq("id", media.id);
    if (error) {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } else {
      toast({ title: "Mídia removida" });
      setMedia({ media_type: "image", ativo: true });
      loadMedia();
    }
  };

  const addCarouselItem = () => {
    if (!newCarouselUrl.trim()) {
      toast({ title: "Forneça uma URL válida", variant: "destructive" });
      return;
    }
    setMedia({
      ...media,
      carousel_items: [...(media.carousel_items || []), newCarouselUrl],
    });
    setNewCarouselUrl("");
  };

  const removeCarouselItem = (index: number) => {
    setMedia({
      ...media,
      carousel_items: media.carousel_items?.filter((_, i) => i !== index) || [],
    });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mídia de Fundo - Seção Hero Mobile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de Mídia</label>
          <Select value={media.media_type} onValueChange={(type: any) => setMedia({ ...media, media_type: type })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Imagem Estática</SelectItem>
              <SelectItem value="video">Vídeo em Loop</SelectItem>
              <SelectItem value="carousel">Carrossel de Imagens</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {media.media_type !== "carousel" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload de Ficheiro</label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="file"
                  accept={media.media_type === "video" ? "video/*" : "image/*"}
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {file ? file.name : `Clique ou arraste um ${media.media_type}`}
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ou Cole a URL</label>
              <Input
                placeholder={`https://exemplo.com/ficheiro.${media.media_type === "video" ? "mp4" : "jpg"}`}
                value={media.media_url || ""}
                onChange={(e) => setMedia({ ...media, media_url: e.target.value })}
              />
            </div>

            {media.media_url && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Pré-visualização:</p>
                {media.media_type === "video" ? (
                  <video src={media.media_url} className="w-full h-32 object-cover rounded" autoPlay muted loop playsInline />
                ) : (
                  <img src={media.media_url} alt="Preview" className="w-full h-32 object-cover rounded" />
                )}
              </div>
            )}
          </div>
        )}

        {media.media_type === "carousel" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Adicionar Imagens ao Carrossel</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://exemplo.com/imagem.jpg"
                  value={newCarouselUrl}
                  onChange={(e) => setNewCarouselUrl(e.target.value)}
                />
                <Button onClick={addCarouselItem} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Adicionar
                </Button>
              </div>
            </div>

            {media.carousel_items && media.carousel_items.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Imagens do Carrossel ({media.carousel_items.length})</p>
                <div className="grid grid-cols-2 gap-3">
                  {media.carousel_items.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`Carousel ${idx}`} className="w-full h-24 object-cover rounded" />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeCarouselItem(idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Intervalo de Auto-play (ms)</label>
          <Input
            type="number"
            min="1000"
            step="500"
            value={media.auto_play_interval || 5000}
            onChange={(e) => setMedia({ ...media, auto_play_interval: parseInt(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">Tempo entre transições (apenas para carrossel)</p>
        </div>

        <div className="flex items-center justify-between p-3 border rounded-lg">
          <span className="text-sm font-medium">Ativar Mídia de Fundo</span>
          <Switch checked={media.ativo} onCheckedChange={(ativo) => setMedia({ ...media, ativo })} />
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={saveMedia} disabled={saving} className="flex-1 gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
          {media.id && (
            <Button onClick={deleteMedia} variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" /> Remover
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminHeroBackgroundTab;
