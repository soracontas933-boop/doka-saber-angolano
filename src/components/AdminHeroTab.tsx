import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ImagePlus, Trash2, Loader2, GripVertical, LogIn, Image as ImageIcon, Video, Save } from "lucide-react";
import { ImageCropper } from "./ImageCropper";

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
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadingLogin, setUploadingLogin] = useState(false);
  const [uploadingSection, setUploadingSection] = useState<string | null>(null);
  const [savingVideo, setSavingVideo] = useState(false);
  const [sectionImages, setSectionImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [cropImage, setCropImage] = useState<{ file: File; sectionKey: string } | null>(null);

  const fetchData = useCallback(async () => {
    const [imgRes, settingsRes] = await Promise.all([
      supabase.from("hero_images").select("*").order("ordem", { ascending: true }),
      supabase.from("site_settings").select("*").in("chave", [
        "hero_carousel", 
        "auth_login_image",
        "section_video_journey",
        "section_image_stats",
        "section_image_features",
        "section_image_steps",
        "section_image_testimonials",
        "section_image_pricing",
        "section_image_partners",
        "section_image_faq",
        "section_image_cta",
        "section_image_journey"
      ]),
    ]);
    
    setImages((imgRes.data as HeroImage[]) ?? []);
    
    if (settingsRes.data) {
      const carousel = settingsRes.data.find(s => s.chave === "hero_carousel");
      const loginImg = settingsRes.data.find(s => s.chave === "auth_login_image");
      const video = settingsRes.data.find(s => s.chave === "section_video_journey");
      
      if (carousel) setCarouselEnabled(carousel.valor === "true");
      if (loginImg) setLoginImageUrl(loginImg.valor);
      if (video) setVideoUrl(video.valor);

      const sectionImgs: Record<string, string> = {};
      settingsRes.data.forEach(s => {
        if (s.chave.startsWith("section_image_")) {
          sectionImgs[s.chave] = s.valor;
        }
      });
      setSectionImages(sectionImgs);
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
      const { error } = await supabase
        .from("site_settings")
        .upsert({ 
          chave: "auth_login_image", 
          valor: publicUrl,
          atualizado_em: new Date().toISOString() 
        }, { onConflict: "chave" });

      if (error) throw error;

      toast({ title: "Imagem de login actualizada" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao carregar imagem", description: error.message, variant: "destructive" });
    } finally {
      setUploadingLogin(false);
      e.target.value = "";
    }
  };

  const handleSaveVideo = async () => {
    setSavingVideo(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ 
          chave: "section_video_journey", 
          valor: videoUrl,
          atualizado_em: new Date().toISOString() 
        }, { onConflict: "chave" });

      if (error) throw error;
      toast({ title: "URL do vídeo guardada com sucesso" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao guardar vídeo", description: error.message, variant: "destructive" });
    } finally {
      setSavingVideo(false);
    }
  };

  const handleSectionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, sectionKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropImage({ file, sectionKey });
    e.target.value = "";
  };

  const onCropComplete = async (croppedFile: File) => {
    if (!cropImage) return;
    const { sectionKey } = cropImage;
    setCropImage(null);
    setUploadingSection(sectionKey);
    
    try {
      const ext = "jpg";
      const fileName = `section_${sectionKey}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("hero-images")
        .upload(fileName, croppedFile, { cacheControl: "31536000", upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("hero-images").getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      const { error } = await supabase
        .from("site_settings")
        .upsert({ 
          chave: sectionKey, 
          valor: publicUrl,
          atualizado_em: new Date().toISOString() 
        }, { onConflict: "chave" });

      if (error) throw error;

      toast({ title: "Imagem da secção actualizada" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao carregar imagem", description: error.message, variant: "destructive" });
    } finally {
      setUploadingSection(null);
    }
  };

  const handleDeleteSectionImage = async (sectionKey: string) => {
    try {
      await supabase
        .from("site_settings")
        .update({ valor: "", atualizado_em: new Date().toISOString() })
        .eq("chave", sectionKey);
        
      toast({ title: "Imagem da secção removida" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao remover imagem", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteLoginImage = async () => {
    if (!loginImageUrl) return;
    
    try {
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
                  Remover
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full max-w-md h-32 border-dashed" onClick={() => document.getElementById("login-upload")?.click()} disabled={uploadingLogin}>
              {uploadingLogin ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-8 w-8 text-muted-foreground" />}
            </Button>
          )}
          <input id="login-upload" type="file" accept="image/*" className="hidden" onChange={handleLoginImageUpload} />
        </CardContent>
      </Card>

      {/* Hero Configuration */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                Imagens do Hero (Home)
              </CardTitle>
              <CardDescription>
                Gerencie as imagens de fundo da seção principal.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="carousel-mode" className="text-xs font-medium">Carrossel</Label>
              <Switch id="carousel-mode" checked={carouselEnabled} onCheckedChange={handleCarouselToggle} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Button onClick={() => document.getElementById("hero-upload")?.click()} disabled={uploading} className="gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Adicionar Imagens
            </Button>
            <input id="hero-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img, index) => (
              <div key={img.id} className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${img.ativo ? "border-primary/50" : "border-transparent opacity-60"}`}>
                <img src={img.url} alt={`Hero ${index}`} className="w-full h-full object-cover" />
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => moveImage(index, "up")} disabled={index === 0}>
                      <GripVertical className="h-4 w-4 rotate-90" />
                    </Button>
                    <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => moveImage(index, "down")} disabled={index === images.length - 1}>
                      <GripVertical className="h-4 w-4 -rotate-90" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={img.ativo} onCheckedChange={() => handleToggleActive(img)} />
                    <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDelete(img)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {img.ativo && (
                  <div className="absolute top-2 left-2 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    ACTIVO
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Video Configuration for 3rd Section */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Vídeo da 3ª Secção (Jornada)
          </CardTitle>
          <CardDescription>
            Adicione um vídeo do YouTube ou Vimeo para aparecer na terceira secção da página inicial.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              placeholder="https://www.youtube.com/watch?v=..." 
              value={videoUrl} 
              onChange={(e) => setVideoUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSaveVideo} disabled={savingVideo} className="gap-2">
              {savingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </div>
          {videoUrl && (
            <div className="mt-4 aspect-video rounded-lg overflow-hidden border bg-black">
              <iframe
                src={videoUrl.includes('watch?v=') ? videoUrl.replace('watch?v=', 'embed/') : videoUrl}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Home Section Images */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Imagens das Secções
          </CardTitle>
          <CardDescription>
            Personalize as imagens que aparecem em cada secção da landing page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { key: "section_image_journey", label: "Secção Jornada (3ª Secção)" },
              { key: "section_image_stats", label: "Secção Estatísticas" },
              { key: "section_image_features", label: "Secção Funcionalidades" },
              { key: "section_image_steps", label: "Secção Como Funciona" },
              { key: "section_image_testimonials", label: "Secção Depoimentos" },
              { key: "section_image_pricing", label: "Secção Preços" },
              { key: "section_image_partners", label: "Secção Parceiros" },
              { key: "section_image_faq", label: "Secção FAQ" },
              { key: "section_image_cta", label: "Secção CTA Final" },
            ].map((section) => (
              <div key={section.key} className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{section.label}</Label>
                <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted/30 group">
                  {sectionImages[section.key] ? (
                    <>
                      <img src={sectionImages[section.key]} alt={section.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => document.getElementById(`upload-${section.key}`)?.click()}>
                          Alterar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteSectionImage(section.key)}>
                          Remover
                        </Button>
                      </div>
                    </>
                  ) : (
                    <button 
                      className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
                      onClick={() => document.getElementById(`upload-${section.key}`)?.click()}
                      disabled={uploadingSection === section.key}
                    >
                      {uploadingSection === section.key ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      ) : (
                        <>
                          <ImagePlus className="h-6 w-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Carregar Imagem</span>
                        </>
                      )}
                    </button>
                  )}
                  <input 
                    id={`upload-${section.key}`} 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleSectionImageUpload(e, section.key)} 
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {cropImage && (
        <ImageCropper 
          imageFile={cropImage.file} 
          onCropComplete={onCropComplete} 
          onCancel={() => setCropImage(null)} 
        />
      )}
    </div>
  );
};

export default AdminHeroTab;
