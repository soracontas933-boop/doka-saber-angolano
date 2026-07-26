import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Megaphone, Plus, Trash2, Edit, Loader2, Image as ImageIcon, ExternalLink, Upload, Film, Eye } from "lucide-react";

interface Popup {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  target_plan: string;
  media_type: 'image' | 'video';
  max_views_per_day: number;
  created_at: string;
}

const AdminMarketingTab = () => {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [targetPlan, setTargetPlan] = useState("all");
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [maxViews, setMaxViews] = useState(1);

  const fetchPopups = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("popups") as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar pop-ups", description: error.message, variant: "destructive" });
    } else {
      setPopups(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPopups();
  }, []);

  const handleOpenDialog = (popup: Popup | null = null) => {
    if (popup) {
      setEditingPopup(popup);
      setTitle(popup.title);
      setContent(popup.content);
      setMediaUrl(popup.image_url || "");
      setLinkUrl(popup.link_url || "");
      setIsActive(popup.is_active);
      setTargetPlan(popup.target_plan);
      setMediaType(popup.media_type || 'image');
      setMaxViews(popup.max_views_per_day || 1);
    } else {
      setEditingPopup(null);
      setTitle("");
      setContent("");
      setMediaUrl("");
      setLinkUrl("");
      setIsActive(false);
      setTargetPlan("all");
      setMediaType('image');
      setMaxViews(1);
    }
    setDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `popups/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('marketing')
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('marketing')
      .getPublicUrl(filePath);

    setMediaUrl(publicUrl);
    setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
    setUploading(false);
    toast({ title: "Arquivo carregado com sucesso" });
  };

  const handleSave = async () => {
    if (!title || !content) {
      toast({ title: "Campos obrigatórios", description: "Título e conteúdo são necessários.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const popupData = {
      title,
      content,
      image_url: mediaUrl || null,
      link_url: linkUrl || null,
      is_active: isActive,
      target_plan: targetPlan,
      media_type: mediaType,
      max_views_per_day: maxViews,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingPopup) {
      const { error: err } = await (supabase.from("popups") as any)
        .update(popupData)
        .eq("id", editingPopup.id);
      error = err;
    } else {
      const { error: err } = await (supabase.from("popups") as any)
        .insert([popupData]);
      error = err;
    }

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingPopup ? "Pop-up atualizado" : "Pop-up criado com sucesso" });
      setDialogOpen(false);
      fetchPopups();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este pop-up?")) return;

    const { error } = await (supabase.from("popups") as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pop-up excluído" });
      fetchPopups();
    }
  };

  const handleToggleActive = async (popup: Popup) => {
    const { error } = await (supabase.from("popups") as any)
      .update({ is_active: !popup.is_active, updated_at: new Date().toISOString() })
      .eq("id", popup.id);

    if (error) {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
    } else {
      fetchPopups();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Marketing & Pop-ups</h2>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Pop-up
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Visualizações/Dia</TableHead>
                  <TableHead>Público-alvo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {popups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Nenhum pop-up configurado.
                    </TableCell>
                  </TableRow>
                ) : (
                  popups.map((popup) => (
                    <TableRow key={popup.id}>
                      <TableCell className="font-medium">{popup.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {popup.media_type === 'video' ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                          <span className="text-xs capitalize">{popup.media_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{popup.max_views_per_day}x</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{popup.target_plan === 'all' ? 'Todos' : popup.target_plan}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={popup.is_active} 
                            onCheckedChange={() => handleToggleActive(popup)}
                          />
                          <span className={popup.is_active ? "text-emerald-600" : "text-muted-foreground"}>
                            {popup.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(popup)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(popup.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPopup ? "Editar Pop-up" : "Criar Novo Pop-up"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">Título</label>
              <Input 
                id="title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Ex: Promoção de Inverno!"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="content" className="text-sm font-medium">Conteúdo (HTML suportado)</label>
              <Textarea 
                id="content" 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
                placeholder="Descreva a mensagem do pop-up..."
                className="min-h-[100px]"
              />
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">Mídia (Imagem ou Vídeo)</label>
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <Input 
                    value={mediaUrl} 
                    onChange={(e) => setMediaUrl(e.target.value)} 
                    placeholder="URL da mídia ou faça upload..."
                    className="flex-1"
                  />
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept="image/*,video/*" 
                    className="hidden" 
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="gap-2"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload
                  </Button>
                </div>
                
                {mediaUrl && (
                  <div className="mt-2 border rounded-lg p-2 bg-muted/30 relative group">
                    {mediaType === 'image' ? (
                      <img src={mediaUrl} alt="Preview" className="max-h-40 mx-auto rounded" />
                    ) : (
                      <video src={mediaUrl} className="max-h-40 mx-auto rounded" controls />
                    )}
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setMediaUrl("")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      id="type-image" 
                      checked={mediaType === 'image'} 
                      onChange={() => setMediaType('image')} 
                    />
                    <label htmlFor="type-image" className="text-xs">Imagem</label>
                  </div>
                  <div className="items-center gap-2 flex">
                    <input 
                      type="radio" 
                      id="type-video" 
                      checked={mediaType === 'video'} 
                      onChange={() => setMediaType('video')} 
                    />
                    <label htmlFor="type-video" className="text-xs">Vídeo</label>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="linkUrl" className="text-sm font-medium">URL de Destino (Opcional)</label>
                <Input 
                  id="linkUrl" 
                  value={linkUrl} 
                  onChange={(e) => setLinkUrl(e.target.value)} 
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="maxViews" className="text-sm font-medium">Visualizações por dia (por usuário)</label>
                <Input 
                  id="maxViews" 
                  type="number"
                  min="1"
                  max="100"
                  value={maxViews} 
                  onChange={(e) => setMaxViews(parseInt(e.target.value) || 1)} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="targetPlan" className="text-sm font-medium">Público-alvo (Plano)</label>
                <Select value={targetPlan} onValueChange={setTargetPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os utilizadores</SelectItem>
                    <SelectItem value="gratuito">Apenas Gratuitos</SelectItem>
                    <SelectItem value="basico">Apenas Básicos</SelectItem>
                    <SelectItem value="profissional">Apenas Profissionais</SelectItem>
                    <SelectItem value="premium">Apenas Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-8">
                <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
                <label htmlFor="isActive" className="text-sm font-medium">Ativar imediatamente</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingPopup ? "Salvar Alterações" : "Criar Pop-up"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMarketingTab;
