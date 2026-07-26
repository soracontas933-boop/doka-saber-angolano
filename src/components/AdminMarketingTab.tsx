import { useEffect, useState } from "react";
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
import { Megaphone, Plus, Trash2, Edit, Loader2, Image as ImageIcon, ExternalLink } from "lucide-react";

interface Popup {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  target_plan: string;
  created_at: string;
}

const AdminMarketingTab = () => {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [targetPlan, setTargetPlan] = useState("all");

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
      setImageUrl(popup.image_url || "");
      setLinkUrl(popup.link_url || "");
      setIsActive(popup.is_active);
      setTargetPlan(popup.target_plan);
    } else {
      setEditingPopup(null);
      setTitle("");
      setContent("");
      setImageUrl("");
      setLinkUrl("");
      setIsActive(false);
      setTargetPlan("all");
    }
    setDialogOpen(true);
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
      image_url: imageUrl || null,
      link_url: linkUrl || null,
      is_active: isActive,
      target_plan: targetPlan,
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
                  <TableHead>Público-alvo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {popups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      Nenhum pop-up configurado.
                    </TableCell>
                  </TableRow>
                ) : (
                  popups.map((popup) => (
                    <TableRow key={popup.id}>
                      <TableCell className="font-medium">{popup.title}</TableCell>
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
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(popup.created_at).toLocaleDateString("pt-AO")}
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
        <DialogContent className="max-w-2xl">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="imageUrl" className="text-sm font-medium">URL da Imagem (Opcional)</label>
                <div className="flex gap-2">
                  <Input 
                    id="imageUrl" 
                    value={imageUrl} 
                    onChange={(e) => setImageUrl(e.target.value)} 
                    placeholder="https://..."
                  />
                  {imageUrl && (
                    <Button variant="outline" size="icon" onClick={() => window.open(imageUrl, '_blank')}>
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <label htmlFor="linkUrl" className="text-sm font-medium">URL de Destino (Opcional)</label>
                <div className="flex gap-2">
                  <Input 
                    id="linkUrl" 
                    value={linkUrl} 
                    onChange={(e) => setLinkUrl(e.target.value)} 
                    placeholder="https://..."
                  />
                  {linkUrl && (
                    <Button variant="outline" size="icon" onClick={() => window.open(linkUrl, '_blank')}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
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
