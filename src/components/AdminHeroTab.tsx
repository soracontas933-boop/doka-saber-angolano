import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ImagePlus, Trash2, Loader2, GripVertical, LogIn, Image as ImageIcon, Video, Save, AlignLeft, AlignCenter, AlignRight, Info } from "lucide-react";
import { ImageCropper } from "./ImageCropper";

interface HeroItem {
  id: string;
  url: string;
  video_url: string | null;
  tipo: string;
  ordem: number;
  ativo: boolean;
  criado_em: string;
}

const AdminHeroTab = () => {
  const [items, setItems] = useState<HeroItem[]>([]);
  const [carouselEnabled, setCarouselEnabled] = useState(false);
  const [loginImageUrl, setLoginImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [heroTextAlign, setHeroTextAlign] = useState<string>("center");
  const [newHeroVideoUrl, setNewHeroVideoUrl] = useState<string>("");

  // Sobre Nós
  const [aboutEnabled, setAboutEnabled] = useState(true);
  const [aboutTitle, setAboutTitle] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [aboutImage, setAboutImage] = useState("");
  const [aboutPosition, setAboutPosition] = useState<"left" | "right">("left");
  const [savingAbout, setSavingAbout] = useState(false);
  const [uploadingAbout, setUploadingAbout] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadingLogin, setUploadingLogin] = useState(false);
  const [uploadingSection, setUploadingSection] = useState<string | null>(null);
  const [savingVideo, setSavingVideo] = useState(false);
  const [savingHeroVideo, setSavingHeroVideo] = useState(false);
  const [savingAlign, setSavingAlign] = useState(false);
  const [sectionImages, setSectionImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [cropImage, setCropImage] = useState<{ file: File; sectionKey: string } | null>(null);

  const fetchData = useCallback(async () => {
    const [imgRes, settingsRes] = await Promise.all([
      supabase.from("hero_images").select("*").order("ordem", { ascending: true }),
      supabase.from("site_settings").select("*"),
    ]);

    setItems((imgRes.data as HeroItem[]) ?? []);

    if (settingsRes.data) {
      const map: Record<string, string> = {};
      settingsRes.data.forEach(s => { map[s.chave] = s.valor; });

      if (map.hero_carousel) setCarouselEnabled(map.hero_carousel === "true");
      if (map.auth_login_image !== undefined) setLoginImageUrl(map.auth_login_image || null);
      if (map.section_video_journey !== undefined) setVideoUrl(map.section_video_journey || "");
      if (map.hero_text_align) setHeroTextAlign(map.hero_text_align);

      if (map.section_about_enabled !== undefined) setAboutEnabled(map.section_about_enabled !== "false");
      if (map.section_about_title !== undefined) setAboutTitle(map.section_about_title);
      if (map.section_about_text !== undefined) setAboutText(map.section_about_text);
      if (map.section_about_image !== undefined) setAboutImage(map.section_about_image);
      if (map.section_about_position) setAboutPosition((map.section_about_position as "left" | "right") || "left");

      const sectionImgs: Record<string, string> = {};
      Object.keys(map).forEach(k => {
        if (k.startsWith("section_image_")) sectionImgs[k] = map[k];
      });
      setSectionImages(sectionImgs);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const upsertSetting = async (chave: string, valor: string) => {
    return supabase.from("site_settings").upsert({
      chave,
      valor,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "chave" });
  };

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
        await supabase.from("hero_images").insert({
          url: urlData.publicUrl,
          ordem: items.length,
          ativo: true,
          tipo: "image",
        });
      }
      toast({ title: "Imagem(ns) carregada(s)" });
      fetchData();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleAddHeroVideo = async () => {
    if (!newHeroVideoUrl.trim()) {
      toast({ title: "Insira o URL do vídeo", variant: "destructive" });
      return;
    }
    setSavingHeroVideo(true);
    try {
      const { error } = await supabase.from("hero_images").insert({
        url: newHeroVideoUrl.trim(),
        video_url: newHeroVideoUrl.trim(),
        ordem: items.length,
        ativo: true,
        tipo: "video",
      });
      if (error) throw error;
      toast({ title: "Vídeo adicionado ao Hero" });
      setNewHeroVideoUrl("");
      fetchData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSavingHeroVideo(false);
    }
  };

  const handleSaveAlign = async (val: string) => {
    setHeroTextAlign(val);
    setSavingAlign(true);
    try {
      await upsertSetting("hero_text_align", val);
      toast({ title: "Alinhamento actualizado" });
    } finally {
      setSavingAlign(false);
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
      await upsertSetting("auth_login_image", urlData.publicUrl);
      toast({ title: "Imagem de login actualizada" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setUploadingLogin(false);
      e.target.value = "";
    }
  };

  const handleSaveVideo = async () => {
    setSavingVideo(true);
    try {
      await upsertSetting("section_video_journey", videoUrl);
      toast({ title: "Vídeo da 3ª secção guardado" });
      fetchData();
    } finally {
      setSavingVideo(false);
    }
  };

  const handleAboutImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAbout(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `about_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("hero-images")
        .upload(fileName, file, { cacheControl: "31536000", upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("hero-images").getPublicUrl(fileName);
      await upsertSetting("section_about_image", urlData.publicUrl);
      setAboutImage(urlData.publicUrl);
      toast({ title: "Imagem da secção Sobre Nós actualizada" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setUploadingAbout(false);
      e.target.value = "";
    }
  };

  const handleSaveAbout = async () => {
    setSavingAbout(true);
    try {
      await Promise.all([
        upsertSetting("section_about_title", aboutTitle),
        upsertSetting("section_about_text", aboutText),
        upsertSetting("section_about_position", aboutPosition),
        upsertSetting("section_about_enabled", aboutEnabled ? "true" : "false"),
      ]);
      toast({ title: "Secção Sobre Nós guardada" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSavingAbout(false);
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
      const fileName = `section_${sectionKey}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("hero-images")
        .upload(fileName, croppedFile, { cacheControl: "31536000", upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("hero-images").getPublicUrl(fileName);
      await upsertSetting(sectionKey, urlData.publicUrl);
      toast({ title: "Imagem da secção actualizada" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setUploadingSection(null);
    }
  };

  const handleDeleteSectionImage = async (sectionKey: string) => {
    await supabase.from("site_settings").update({ valor: "", atualizado_em: new Date().toISOString() }).eq("chave", sectionKey);
    toast({ title: "Imagem removida" });
    fetchData();
  };

  const handleDeleteLoginImage = async () => {
    if (!loginImageUrl) return;
    await supabase.from("site_settings").update({ valor: "", atualizado_em: new Date().toISOString() }).eq("chave", "auth_login_image");
    toast({ title: "Imagem de login removida" });
    fetchData();
  };

  const handleDelete = async (item: HeroItem) => {
    if (item.tipo === "image") {
      const parts = item.url.split("/hero-images/");
      const fileName = parts[parts.length - 1];
      if (fileName && !fileName.startsWith("http")) {
        await supabase.storage.from("hero-images").remove([fileName]);
      }
    }
    await supabase.from("hero_images").delete().eq("id", item.id);
    toast({ title: "Item removido" });
    fetchData();
  };

  const handleToggleActive = async (item: HeroItem) => {
    await supabase.from("hero_images").update({ ativo: !item.ativo }).eq("id", item.id);
    fetchData();
  };

  const handleCarouselToggle = async (checked: boolean) => {
    setCarouselEnabled(checked);
    await upsertSetting("hero_carousel", checked ? "true" : "false");
    toast({ title: checked ? "Carrossel activado" : "Carrossel desactivado" });
  };

  const moveItem = async (index: number, direction: "up" | "down") => {
    const newItems = [...items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    await Promise.all(
      newItems.map((it, i) => supabase.from("hero_images").update({ ordem: i }).eq("id", it.id))
    );
    fetchData();
  };

  const getEmbedUrl = (url: string) => {
    if (url.includes("youtube.com/watch?v=")) return url.replace("watch?v=", "embed/");
    if (url.includes("youtu.be/")) return url.replace("youtu.be/", "youtube.com/embed/");
    return url;
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
                <Button size="sm" variant="secondary" onClick={() => document.getElementById("login-upload")?.click()}>Alterar</Button>
                <Button size="sm" variant="destructive" onClick={handleDeleteLoginImage}>Remover</Button>
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
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                Hero (Home) — Imagens & Vídeos
              </CardTitle>
              <CardDescription>
                Adicione imagens (upload) ou vídeos (YouTube/Vimeo) ao fundo do Hero.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="carousel-mode" className="text-xs font-medium">Carrossel</Label>
              <Switch id="carousel-mode" checked={carouselEnabled} onCheckedChange={handleCarouselToggle} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hero Text Alignment */}
          <div className="space-y-2 p-4 rounded-lg border bg-muted/30">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Alinhamento do Texto do Hero</Label>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={heroTextAlign === "left" ? "default" : "outline"} onClick={() => handleSaveAlign("left")} disabled={savingAlign} className="gap-2">
                <AlignLeft className="h-4 w-4" /> Esquerda
              </Button>
              <Button type="button" size="sm" variant={heroTextAlign === "center" ? "default" : "outline"} onClick={() => handleSaveAlign("center")} disabled={savingAlign} className="gap-2">
                <AlignCenter className="h-4 w-4" /> Centro
              </Button>
              <Button type="button" size="sm" variant={heroTextAlign === "right" ? "default" : "outline"} onClick={() => handleSaveAlign("right")} disabled={savingAlign} className="gap-2">
                <AlignRight className="h-4 w-4" /> Direita
              </Button>
            </div>
          </div>

          {/* Add image */}
          <div className="flex items-center gap-4 flex-wrap">
            <Button onClick={() => document.getElementById("hero-upload")?.click()} disabled={uploading} className="gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Adicionar Imagens
            </Button>
            <input id="hero-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          </div>

          {/* Add video */}
          <div className="space-y-2 p-4 rounded-lg border bg-muted/30">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Video className="h-4 w-4" /> Adicionar Vídeo ao Hero
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={newHeroVideoUrl}
                onChange={(e) => setNewHeroVideoUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddHeroVideo} disabled={savingHeroVideo} className="gap-2">
                {savingHeroVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Adicionar
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Suporta YouTube e Vimeo. Vídeos aparecem em loop e em mute no fundo do Hero.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((item, index) => (
              <div key={item.id} className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${item.ativo ? "border-primary/50" : "border-transparent opacity-60"}`}>
                {item.tipo === "video" ? (
                  <iframe src={getEmbedUrl(item.video_url || item.url)} className="w-full h-full pointer-events-none" />
                ) : (
                  <img src={item.url} alt={`Hero ${index}`} className="w-full h-full object-cover" />
                )}

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => moveItem(index, "up")} disabled={index === 0}>
                      <GripVertical className="h-4 w-4 rotate-90" />
                    </Button>
                    <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => moveItem(index, "down")} disabled={index === items.length - 1}>
                      <GripVertical className="h-4 w-4 -rotate-90" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={item.ativo} onCheckedChange={() => handleToggleActive(item)} />
                    <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDelete(item)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="absolute top-2 left-2 flex gap-1">
                  {item.ativo && (
                    <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold">ACTIVO</span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.tipo === "video" ? "bg-purple-600 text-white" : "bg-blue-600 text-white"}`}>
                    {item.tipo === "video" ? "VÍDEO" : "IMAGEM"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* About Us Section */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Secção "Sobre Nós" (Landing Page)
              </CardTitle>
              <CardDescription>
                Aparece a seguir às Funcionalidades. Imagem ocupa toda a altura da secção.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="about-enabled" className="text-xs font-medium">Activa</Label>
              <Switch id="about-enabled" checked={aboutEnabled} onCheckedChange={setAboutEnabled} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Image */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Imagem</Label>
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden border bg-muted/30 group">
                {aboutImage ? (
                  <>
                    <img src={aboutImage} alt="Sobre Nós" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => document.getElementById("about-upload")?.click()}>Alterar</Button>
                    </div>
                  </>
                ) : (
                  <button
                    className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
                    onClick={() => document.getElementById("about-upload")?.click()}
                    disabled={uploadingAbout}
                  >
                    {uploadingAbout ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : (
                      <>
                        <ImagePlus className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Carregar Imagem</span>
                      </>
                    )}
                  </button>
                )}
                <input id="about-upload" type="file" accept="image/*" className="hidden" onChange={handleAboutImageUpload} />
              </div>
            </div>

            {/* Text */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título</Label>
                <Input value={aboutTitle} onChange={(e) => setAboutTitle(e.target.value)} placeholder="Sobre Nós" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Texto</Label>
                <Textarea value={aboutText} onChange={(e) => setAboutText(e.target.value)} rows={6} placeholder="Conte a história da plataforma..." />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Posição da Imagem</Label>
                <Select value={aboutPosition} onValueChange={(v) => setAboutPosition(v as "left" | "right")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Imagem à Esquerda · Texto à Direita</SelectItem>
                    <SelectItem value="right">Imagem à Direita · Texto à Esquerda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button onClick={handleSaveAbout} disabled={savingAbout} className="gap-2">
            {savingAbout ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar Secção Sobre Nós
          </Button>
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
              <iframe src={getEmbedUrl(videoUrl)} className="w-full h-full" allowFullScreen />
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
          <CardDescription>Personalize as imagens que aparecem em cada secção da landing page.</CardDescription>
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
                        <Button size="sm" variant="secondary" onClick={() => document.getElementById(`upload-${section.key}`)?.click()}>Alterar</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteSectionImage(section.key)}>Remover</Button>
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
