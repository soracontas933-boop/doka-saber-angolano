import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ImagePlus, Trash2, Loader2, GripVertical, LogIn } from "lucide-react";

interface HeroImage {
  id: string;
  url: string;
  ordem: number;
  ativo: boolean;
  criado_em: string;
}

const AdminHeroTab = () => {
  const [images, setImages] = useState<HeroImage[]>([]);
  const [carouselEnabled, setCarouselEnabled] = useState(false);
  const [loginImageUrl, setLoginImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogin, setUploadingLogin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [imgRes, settingsRes] = await Promise.all([
      supabase.from("hero_images").select("*").order("ordem", { ascending: true }),
      supabase.from("site_settings").select("*").in("chave", ["hero_carousel", "auth_login_image"]),
    ]);
    
    setImages((imgRes.data as HeroImage[]) ?? []);
    
    if (settingsRes.data) {
      const carousel = settingsRes.data.find(s => s.chave === "hero_carousel");
      const loginImg = settingsRes.data.find(s => s.chave === "auth_login_image");
      
      if (carousel) setCarouselEnabled(carousel.valor === "true");
      if (loginImg) setLoginImageUrl(loginImg.valor);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const fileName = `hero_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("hero-images")
          .upload(fileName, file, { cacheControl: "31536000", upsert: false });

        if (uploadError) {
          toast({ title: "Erro ao carregar", description: uploadError.message, variant: "destructive" });
          continue;
        }

        const { data: urlData } = supabase.storage.from("hero-images").getPublicUrl(fileName);

        const nextOrder = images.length;
        await supabase.from("hero_images").insert({
          url: urlData.publicUrl,
          ordem: nextOrder,
          ativo: true,
        });
      }
      toast({ title: "Imagem(ns) carregada(s) com sucesso" });
      fetchData();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleLoginImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogin(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `login_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("hero-images")
        .upload(fileName, file, { cacheControl: "31536000", upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("hero-images").getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      // Update or insert site_setting
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("chave", "auth_login_image")
        .single();

      if (existing) {
        await supabase
          .from("site_settings")
          .update({ valor: publicUrl, atualizado_em: new Date().toISOString() })
          .eq("chave", "auth_login_image");
      } else {
        await supabase
          .from("site_settings")
          .insert({ chave: "auth_login_image", valor: publicUrl });
      }

      toast({ title: "Imagem de login actualizada" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao carregar imagem", description: error.message, variant: "destructive" });
    } finally {
      setUploadingLogin(false);
      e.target.value = "";
    }
  };

  const handleDeleteLoginImage = async () => {
    if (!loginImageUrl) return;
    
    try {
      // Opcional: remover do storage se desejar
      await supabase
        .from("site_settings")
        .update({ valor: "", atualizado_em: new Date().toISOString() })
        .eq("chave", "auth_login_image");
        
      toast({ title: "Imagem de login removida" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao remover imagem", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (img: HeroImage) => {
    const parts = img.url.split("/hero-images/");
    const fileName = parts[parts.length - 1];

    await Promise.all([
      supabase.storage.from("hero-images").remove([fileName]),
      supabase.from("hero_images").delete().eq("id", img.id),
    ]);
    toast({ title: "Imagem removida" });
    fetchData();
  };

  const handleToggleActive = async (img: HeroImage) => {
    await supabase
      .from("hero_images")
      .update({ ativo: !img.ativo })
      .eq("id", img.id);
    fetchData();
  };

  const handleCarouselToggle = async (checked: boolean) => {
    setCarouselEnabled(checked);
    await supabase
      .from("site_settings")
      .update({ valor: checked ? "true" : "false", atualizado_em: new Date().toISOString() })
      .eq("chave", "hero_carousel");
    toast({ title: checked ? "Carrossel activado" : "Carrossel desactivado" });
  };

  const moveImage = async (index: number, direction: "up" | "down") => {
    const newImages = [...images];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newImages.length) return;

    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];

    await Promise.all(
      newImages.map((img, i) =>
        supabase.from("hero_images").update({ ordem: i }).eq("id", img.id)
      )
    );
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Login Image Configuration */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LogIn className="h-5 w-5 text-primary" />
            Imagem da Tela de Login
          </CardTitle>
          <CardDescription>
            Esta imagem aparece no lado esquerdo da tela de login e cadastro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loginImageUrl ? (
            <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden border">
              <img src={loginImageUrl} alt="Login preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => document.getElementById("login-upload")?.click()}>
                  Alterar
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDeleteLoginImage}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="w-full max-w-md aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => document.getElementById("login-upload")?.click()}
            >
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Clique para carregar imagem de login</p>
            </div>
          )}
          <input
            id="login-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLoginImageUpload}
          />
          {uploadingLogin && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> A carregar...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Carousel toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração do Hero</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="carousel-toggle"
              checked={carouselEnabled}
              onCheckedChange={handleCarouselToggle}
            />
            <Label htmlFor="carousel-toggle" className="text-sm">
              Activar carrossel de imagens (se desactivado, mostra apenas a primeira imagem)
            </Label>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              Carregar imagens do Hero (recomendado: 1920×800px, formato WebP ou JPG)
            </Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="gap-2"
                disabled={uploading}
                onClick={() => document.getElementById("hero-upload")?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                {uploading ? "A carregar..." : "Adicionar imagem"}
              </Button>
              <input
                id="hero-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleUpload}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Imagens do Hero ({images.filter((i) => i.ativo).length} activas)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {images.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma imagem carregada. A landing page mostrará o hero sem imagem de fundo.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className={`relative group rounded-xl overflow-hidden border-2 transition-all ${
                    img.ativo ? "border-primary" : "border-muted opacity-60"
                  }`}
                >
                  <img
                    src={img.url}
                    alt={`Hero ${idx + 1}`}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleToggleActive(img)}
                    >
                      {img.ativo ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(img)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {idx > 0 && (
                      <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => moveImage(idx, "up")}>
                        ↑
                      </Button>
                    )}
                    {idx < images.length - 1 && (
                      <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => moveImage(idx, "down")}>
                        ↓
                      </Button>
                    )}
                  </div>
                  <div className="absolute bottom-2 left-2">
                    <span className="bg-background/80 text-foreground text-xs px-2 py-0.5 rounded">
                      #{idx + 1} {img.ativo ? "✓" : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminHeroTab;
