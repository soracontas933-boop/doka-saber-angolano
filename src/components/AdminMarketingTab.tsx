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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Megaphone, Plus, Trash2, Edit, Loader2, Image as ImageIcon,
  ExternalLink, Upload, Film, Eye, ArrowRight, GripVertical, X,
  AppWindow, Link2
} from "lucide-react";

interface InternalButton {
  path: string;
  label: string;
}

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
  internal_buttons: InternalButton[] | null;
  action_button_label: string | null;
  action_button_path: string | null;
}

// Available internal pages in the application
const INTERNAL_PAGES: InternalButton[] = [
  { path: "/home", label: "Início" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/meus-projetos", label: "Meus Projetos" },
  { path: "/trabalho", label: "Trabalho Escolar" },
  { path: "/curriculo", label: "Currículo (CV)" },
  { path: "/resumo", label: "Resumo" },
  { path: "/questionario", label: "Questionário" },
  { path: "/plano-aula", label: "Plano de Aula" },
  { path: "/apresentacao", label: "Apresentação (Slides)" },
  { path: "/correcao", label: "Corrigir Trabalho" },
  { path: "/grupos", label: "Trabalho em Grupo" },
  { path: "/livraria", label: "Livraria" },
  { path: "/minha-biblioteca", label: "Minha Biblioteca" },
  { path: "/planos", label: "Planos & Assinaturas" },
  { path: "/creditos", label: "Créditos Extras" },
  { path: "/faturamento", label: "Faturamento" },
  { path: "/suporte", label: "Suporte & Ajuda" },
  { path: "/configuracoes", label: "Configurações" },
  { path: "/mensagens", label: "Mensagens" },
];

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
  const [internalButtons, setInternalButtons] = useState<InternalButton[]>([]);
  const [actionButtonLabel, setActionButtonLabel] = useState("");
  const [actionButtonPath, setActionButtonPath] = useState("");

  // Button selector state
  const [selectedPage, setSelectedPage] = useState("");

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
      setInternalButtons(popup.internal_buttons || []);
      setActionButtonLabel(popup.action_button_label || "");
      setActionButtonPath(popup.action_button_path || "");
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
      setInternalButtons([]);
      setActionButtonLabel("");
      setActionButtonPath("");
    }
    setSelectedPage("");
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

  const addInternalButton = () => {
    if (!selectedPage) {
      toast({ title: "Selecione uma página", description: "Escolha uma página do aplicativo para adicionar como botão.", variant: "destructive" });
      return;
    }
    const page = INTERNAL_PAGES.find(p => p.path === selectedPage);
    if (!page) return;

    // Check if already added
    if (internalButtons.some(b => b.path === page.path)) {
      toast({ title: "Página já adicionada", description: "Este botão já está na lista.", variant: "destructive" });
      return;
    }

    setInternalButtons([...internalButtons, page]);
    setSelectedPage("");
    toast({ title: "Botão adicionado", description: `${page.label} foi adicionado como botão de navegação.` });
  };

  const removeInternalButton = (index: number) => {
    setInternalButtons(internalButtons.filter((_, i) => i !== index));
  };

  const moveButtonUp = (index: number) => {
    if (index === 0) return;
    const newButtons = [...internalButtons];
    [newButtons[index - 1], newButtons[index]] = [newButtons[index], newButtons[index - 1]];
    setInternalButtons(newButtons);
  };

  const moveButtonDown = (index: number) => {
    if (index === internalButtons.length - 1) return;
    const newButtons = [...internalButtons];
    [newButtons[index], newButtons[index + 1]] = [newButtons[index + 1], newButtons[index]];
    setInternalButtons(newButtons);
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
      internal_buttons: JSON.stringify(internalButtons),
      action_button_label: actionButtonLabel || null,
      action_button_path: actionButtonPath || null,
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
                  <TableHead>Ações</TableHead>
                  <TableHead>Visualizações/Dia</TableHead>
                  <TableHead>Público-alvo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {popups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Nenhum pop-up configurado.
                    </TableCell>
                  </TableRow>
                ) : (
                  popups.map((popup) => {
                    const btnCount = popup.internal_buttons ? (typeof popup.internal_buttons === 'string' ? JSON.parse(popup.internal_buttons) : popup.internal_buttons).length : 0;
                    const extLink = !!popup.link_url;
                    const actionBtn = !!popup.action_button_path;
                    return (
                      <TableRow key={popup.id}>
                        <TableCell className="font-medium">{popup.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {popup.media_type === 'video' ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                            <span className="text-xs capitalize">{popup.media_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            {btnCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs">
                                <AppWindow className="h-3 w-3" />
                                {btnCount} interno{btnCount > 1 ? 's' : ''}
                              </span>
                            )}
                            {extLink && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-xs">
                                <ExternalLink className="h-3 w-3" />
                                Externo
                              </span>
                            )}
                            {actionBtn && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                                <ArrowRight className="h-3 w-3" />
                                Ação
                              </span>
                            )}
                            {!btnCount && !extLink && !actionBtn && (
                              <span className="text-xs text-muted-foreground">Nenhuma</span>
                            )}
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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

            {/* Action Button (Primary CTA - either internal or external) */}
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Botão Principal de Ação</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Este será o botão principal exibido no pop-up. Pode ser um link interno do app ou um link externo.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Botão de Ação Interna (Opcional)</label>
                  <Select value={actionButtonPath} onValueChange={(val) => {
                    setActionButtonPath(val);
                    const page = INTERNAL_PAGES.find(p => p.path === val);
                    if (page) setActionButtonLabel(page.label);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar página do app..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum (usar link externo)</SelectItem>
                      {INTERNAL_PAGES.map((page) => (
                        <SelectItem key={page.path} value={page.path}>
                          {page.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="linkUrl" className="text-sm font-medium">
                    <Link2 className="h-3 w-3 inline mr-1" />
                    Link Externo (Opcional)
                  </label>
                  <Input 
                    id="linkUrl" 
                    value={linkUrl} 
                    onChange={(e) => setLinkUrl(e.target.value)} 
                    placeholder="https://... (usado se não houver botão interno)"
                  />
                </div>
              </div>

              {actionButtonPath && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary font-medium">
                    Botão principal: Navegar para <strong>{actionButtonLabel}</strong> ({actionButtonPath})
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Internal Navigation Buttons */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AppWindow className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Botões de Navegação Interna</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Adicione botões que levam o usuário diretamente para páginas do aplicativo. O usuário poderá clicar neles para navegar instantaneamente.
              </p>

              <div className="flex gap-2">
                <Select value={selectedPage} onValueChange={setSelectedPage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar página para adicionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERNAL_PAGES
                      .filter(p => !internalButtons.some(b => b.path === p.path))
                      .map((page) => (
                        <SelectItem key={page.path} value={page.path}>
                          {page.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={addInternalButton} variant="outline" size="sm" className="gap-1">
                  <Plus className="h-3 w-3" />
                  Adicionar
                </Button>
              </div>

              {internalButtons.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/30 px-3 py-2 flex items-center gap-2">
                    <AppWindow className="h-3 w-3" />
                    <span className="text-xs font-medium">Botões configurados ({internalButtons.length})</span>
                  </div>
                  <div className="divide-y">
                    {internalButtons.map((btn, index) => (
                      <div key={index} className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/10 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 p-0"
                            onClick={() => moveButtonUp(index)}
                            disabled={index === 0}
                          >
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 p-0"
                            onClick={() => moveButtonDown(index)}
                            disabled={index === internalButtons.length - 1}
                          >
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                          </Button>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-primary ml-1" />
                        <span className="text-sm font-medium flex-1">{btn.label}</span>
                        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{btn.path}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => removeInternalButton(index)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="flex items-center gap-2">
              <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="isActive" className="text-sm font-medium">Ativar imediatamente</Label>
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
