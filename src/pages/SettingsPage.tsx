import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";

import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import {
  User,
  Moon,
  Sun,
  Type,
  Ruler,
  Save,
  Loader2,
  Camera,
  Upload,
  Trash2,
  Settings,
  LogOut,
} from "lucide-react";

const FONT_OPTIONS = [
  "Times New Roman",
  "Arial",
  "Calibri",
  "Georgia",
  "Verdana",
  "Tahoma",
  "Cambria",
  "Garamond",
];

const SettingsPage = () => {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { settings: trabalhoSettings, updateSettings } = useTrabalhoSettings();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState({
    nome: "",
    telefone: "",
    idade: "",
    avatar_url: "",
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      setUserEmail(user.email ?? "");

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile({
          nome: data.nome ?? "",
          telefone: data.telefone ?? "",
          idade: data.idade ? String(data.idade) : "",
          avatar_url: data.avatar_url ?? "",
        });
      } else {
        // Profile doesn't exist yet (pre-existing user), create it
        await supabase.from("profiles").insert({ id: user.id });
      }

      setLoading(false);
    };
    load();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
      toast({ title: "Sessão terminada", description: "Até breve!" });
    } catch (error) {
      toast({
        title: "Erro ao sair",
        description: "Não foi possível terminar a sessão.",
        variant: "destructive",
      });
    }
  };

  const handleAvatarFile = async (file: File) => {
    if (!userId) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Ficheiro inválido", description: "Seleciona uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Máximo 5MB.", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${pub.publicUrl}?t=${Date.now()}`;

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (updErr) throw updErr;

      setProfile((p) => ({ ...p, avatar_url: publicUrl }));
      window.dispatchEvent(new CustomEvent("profile:updated"));
      toast({ title: "Foto atualizada!", description: "A tua nova foto de perfil foi guardada." });
    } catch (err) {
      toast({
        title: "Erro ao carregar foto",
        description: err instanceof Error ? err.message : "Tenta novamente.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (!userId) return;
    try {
      await supabase
        .from("profiles")
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq("id", userId);
      setProfile((p) => ({ ...p, avatar_url: "" }));
      window.dispatchEvent(new CustomEvent("profile:updated"));
      toast({ title: "Foto removida" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("profiles")
        .update({
          nome: profile.nome || null,
          telefone: profile.telefone || null,
          idade: profile.idade ? parseInt(profile.idade) : null,
          avatar_url: profile.avatar_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({ title: "Perfil guardado!", description: "As tuas informações foram atualizadas." });
    } catch (err) {
      toast({
        title: "Erro ao guardar",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const initials = profile.nome
    ? profile.nome
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : userEmail.slice(0, 2).toUpperCase();

  return (
    <div className="p-3 sm:p-6 md:p-10 max-w-6xl mx-auto md:bg-background bg-background min-h-screen space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
            <Settings className="h-4 w-4 md:h-5 md:w-5 text-secondary-foreground" />
          </div>
          <h1 className="text-base md:text-2xl font-display font-bold text-foreground">Configurações</h1>
        </div>
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={handleLogout}
          className="md:hidden gap-2 h-8 text-xs"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </Button>
      </div>

      {/* Profile Section */}
      <div className="bg-card md:bg-card border border-border/50 md:border-border rounded-2xl p-3 sm:p-6 shadow-sm md:shadow-card">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 md:mb-6">
          <User className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-sm md:text-lg font-display font-semibold text-foreground">Informações Pessoais</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground">Gere o teu perfil e dados pessoais</p>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          {/* Avatar */}
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="relative flex-shrink-0">
              <Avatar className="h-20 w-20 md:h-24 md:w-24 border-2 border-primary/20">
                <AvatarImage src={profile.avatar_url} alt={profile.nome || "Avatar"} />
                <AvatarFallback className="bg-primary/10 text-primary text-base md:text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <Label className="text-foreground text-xs md:text-sm font-medium">Foto de Perfil</Label>
              <p className="text-[10px] md:text-xs text-muted-foreground">JPG, PNG ou WebP — máx. 5MB</p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAvatarFile(f);
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAvatarFile(f);
                }}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 md:h-9 text-xs gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Galeria
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  onClick={() => cameraInputRef.current?.click()}
                  className="h-8 md:h-9 text-xs gap-1.5 md:hidden"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Câmara
                </Button>
                {profile.avatar_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={uploadingAvatar}
                    onClick={handleRemoveAvatar}
                    className="h-8 md:h-9 text-xs gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator className="bg-muted md:bg-border" />

          {/* Fields - 2 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1.5 md:space-y-2 bg-muted/30 md:bg-background/50 p-3 md:p-4 rounded-lg border border-border md:border-border">
              <Label htmlFor="nome" className="text-foreground text-xs md:text-sm font-medium">Nome Completo</Label>
              <Input
                id="nome"
                value={profile.nome}
                onChange={(e) => setProfile({ ...profile, nome: e.target.value })}
                placeholder="O teu nome"
                className="bg-muted md:bg-background border-border md:border-input text-foreground placeholder:text-muted-foreground md:placeholder:text-muted-foreground h-9 md:h-10 text-xs md:text-sm"
              />
            </div>

            <div className="space-y-1.5 md:space-y-2 bg-muted/30 md:bg-background/50 p-3 md:p-4 rounded-lg border border-border md:border-border">
              <Label htmlFor="email" className="text-foreground text-xs md:text-sm font-medium">Email</Label>
              <Input 
                id="email" 
                value={userEmail} 
                disabled 
                className="bg-muted md:bg-muted border-border md:border-input text-foreground opacity-60 h-9 md:h-10 text-xs md:text-sm" 
              />
            </div>

            <div className="space-y-1.5 md:space-y-2 bg-muted/30 md:bg-background/50 p-3 md:p-4 rounded-lg border border-border md:border-border">
              <Label htmlFor="telefone" className="text-foreground text-xs md:text-sm font-medium">Telefone</Label>
              <Input
                id="telefone"
                value={profile.telefone}
                onChange={(e) => setProfile({ ...profile, telefone: e.target.value })}
                placeholder="+244 9XX XXX XXX"
                className="bg-muted md:bg-background border-border md:border-input text-foreground placeholder:text-muted-foreground md:placeholder:text-muted-foreground h-9 md:h-10 text-xs md:text-sm"
              />
            </div>

            <div className="space-y-1.5 md:space-y-2 bg-muted/30 md:bg-background/50 p-3 md:p-4 rounded-lg border border-border md:border-border">
              <Label htmlFor="idade" className="text-foreground text-xs md:text-sm font-medium">Idade</Label>
              <Input
                id="idade"
                type="number"
                min={10}
                max={99}
                value={profile.idade}
                onChange={(e) => setProfile({ ...profile, idade: e.target.value })}
                placeholder="Ex: 17"
                className="bg-muted md:bg-background border-border md:border-input text-foreground placeholder:text-muted-foreground md:placeholder:text-muted-foreground h-9 md:h-10 text-xs md:text-sm"
              />
            </div>
          </div>

          <Button 
            onClick={handleSaveProfile} 
            disabled={saving} 
            className="w-full gap-2 h-9 md:h-10 text-xs md:text-sm bg-primary hover:bg-primary/90"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Guardando..." : "Guardar Perfil"}
          </Button>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="bg-card md:bg-card border border-border/50 md:border-border rounded-2xl p-3 sm:p-6 shadow-sm md:shadow-card">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 md:mb-6">
          {theme === "dark" ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
          <div>
            <h2 className="text-sm md:text-lg font-display font-semibold text-foreground">Aparência</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground">Personaliza o visual da aplicação</p>
          </div>
        </div>

        <div className="bg-muted/30 md:bg-background/50 p-3 md:p-4 rounded-lg border border-border md:border-border flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground text-xs md:text-sm">Modo Escuro</p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
              {theme === "dark" ? "O modo escuro está activado" : "Activar o modo escuro"}
            </p>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
        </div>
      </div>

      {/* Trabalho Settings Section */}
      <div className="bg-card md:bg-card border border-border/50 md:border-border rounded-2xl p-3 sm:p-6 shadow-sm md:shadow-card">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 md:mb-6">
          <Type className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-sm md:text-lg font-display font-semibold text-foreground">Formatação dos Trabalhos</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground">Define o tipo de letra e margens dos trabalhos escolares</p>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          {/* Font - 2 Columns Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1.5 md:space-y-2 bg-muted/30 md:bg-background/50 p-3 md:p-4 rounded-lg border border-border md:border-border col-span-1 sm:col-span-2">
              <Label className="text-foreground text-xs md:text-sm font-medium">Tipo de Letra</Label>
              <Select
                value={trabalhoSettings.fontFamily}
                onValueChange={(v) => updateSettings({ fontFamily: v })}
              >
                <SelectTrigger className="bg-muted md:bg-background border-border md:border-input text-foreground h-9 md:h-10 text-xs md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font} value={font}>
                      <span style={{ fontFamily: font }}>{font}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[9px] md:text-xs text-muted-foreground">
                Pré-visualização: <span style={{ fontFamily: trabalhoSettings.fontFamily }} className="font-medium text-foreground">AaBbCc 123</span>
              </p>
            </div>
          </div>

          <Separator className="bg-muted md:bg-border" />

          {/* Margins - 2 Columns Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2 md:space-y-3 bg-muted/30 md:bg-background/50 p-3 md:p-4 rounded-lg border border-border md:border-border col-span-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-foreground text-xs md:text-sm font-medium">
                  <Ruler className="h-4 w-4" />
                  Margens
                </Label>
                <span className="text-xs md:text-sm font-medium text-primary">{trabalhoSettings.marginMm} mm</span>
              </div>
              <Slider
                value={[trabalhoSettings.marginMm]}
                onValueChange={([v]) => updateSettings({ marginMm: v })}
                min={15}
                max={40}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-[9px] md:text-xs text-muted-foreground">
                <span>15 mm</span>
                <span>25 mm (padrão)</span>
                <span>40 mm</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
