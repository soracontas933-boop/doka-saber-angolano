import { useEffect, useState } from "react";
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
import { useTrabalhoSettings } from "@/hooks/use-trabalho-settings";
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
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState({
    nome: "",
    telefone: "",
    idade: "",
    avatar_url: "",
  });

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        </div>
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={handleLogout}
          className="md:hidden gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>Gere o teu perfil e dados pessoais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              <AvatarImage src={profile.avatar_url} alt={profile.nome || "Avatar"} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Label htmlFor="avatar_url">URL da Foto de Perfil</Label>
              <div className="flex gap-2">
                <Input
                  id="avatar_url"
                  value={profile.avatar_url}
                  onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                  placeholder="https://exemplo.com/foto.jpg"
                  className="flex-1"
                />
                <Button variant="outline" size="icon" className="shrink-0">
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                value={profile.nome}
                onChange={(e) => setProfile({ ...profile, nome: e.target.value })}
                placeholder="O teu nome"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={userEmail} disabled className="opacity-60" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={profile.telefone}
                onChange={(e) => setProfile({ ...profile, telefone: e.target.value })}
                placeholder="+244 9XX XXX XXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="idade">Idade</Label>
              <Input
                id="idade"
                type="number"
                min={10}
                max={99}
                value={profile.idade}
                onChange={(e) => setProfile({ ...profile, idade: e.target.value })}
                placeholder="Ex: 17"
              />
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Guardando..." : "Guardar Perfil"}
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {theme === "dark" ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
            Aparência
          </CardTitle>
          <CardDescription>Personaliza o visual da aplicação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Modo Escuro</p>
              <p className="text-sm text-muted-foreground">
                {theme === "dark" ? "O modo escuro está activado" : "Activar o modo escuro"}
              </p>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>
        </CardContent>
      </Card>

      {/* Trabalho Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Type className="h-5 w-5 text-primary" />
            Formatação dos Trabalhos
          </CardTitle>
          <CardDescription>Define o tipo de letra e margens dos trabalhos escolares</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Font */}
          <div className="space-y-2">
            <Label>Tipo de Letra</Label>
            <Select
              value={trabalhoSettings.fontFamily}
              onValueChange={(v) => updateSettings({ fontFamily: v })}
            >
              <SelectTrigger>
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
            <p className="text-xs text-muted-foreground">
              Pré-visualização: <span style={{ fontFamily: trabalhoSettings.fontFamily }} className="font-medium">AaBbCc 123</span>
            </p>
          </div>

          <Separator />

          {/* Margins */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Margens
              </Label>
              <span className="text-sm font-medium text-primary">{trabalhoSettings.marginMm} mm</span>
            </div>
            <Slider
              value={[trabalhoSettings.marginMm]}
              onValueChange={([v]) => updateSettings({ marginMm: v })}
              min={15}
              max={40}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>15 mm</span>
              <span>25 mm (padrão)</span>
              <span>40 mm</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
