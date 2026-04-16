import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  GripVertical, 
  ArrowUp, 
  ArrowDown, 
  ImagePlus, 
  Type, 
  Palette, 
  Layout, 
  Sparkles,
  Check,
  RefreshCw
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface LandingSection {
  id: string;
  tipo: string;
  titulo: string;
  conteudo: any;
  ordem: number;
  ativo: boolean;
  isNew?: boolean;
}

const AdminLandingTab = () => {
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("landing_sections")
      .select("*")
      .order("ordem", { ascending: true });

    if (error) {
      toast({ title: "Erro ao carregar secções", description: error.message, variant: "destructive" });
    } else {
      setSections(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSection = async (section: LandingSection) => {
    setSaving(true);
    
    // Preparar dados para salvar
    const sectionData: any = {
      tipo: section.tipo,
      titulo: section.titulo,
      conteudo: section.conteudo,
      ativo: section.ativo,
      ordem: section.ordem,
      atualizado_em: new Date().toISOString()
    };

    // Se não for novo, incluir o ID para o update/upsert
    if (!section.isNew) {
      sectionData.id = section.id;
    }

    const { error } = await supabase
      .from("landing_sections")
      .upsert(sectionData);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Secção salva com sucesso" });
      fetchData();
    }
    setSaving(false);
  };

  const handleImageUpload = async (sectionId: string, path: string[], file: File) => {
    setUploading(`${sectionId}-${path.join("-")}`);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `landing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("landing-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("landing-images").getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      // Update local state
      const newSections = sections.map(s => {
        if (s.id === sectionId) {
          const newConteudo = { ...s.conteudo };
          let current = newConteudo;
          for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
          }
          current[path[path.length - 1]] = publicUrl;
          return { ...s, conteudo: newConteudo };
        }
        return s;
      });
      setSections(newSections);
      
      // Save to DB
      const targetSection = newSections.find(s => s.id === sectionId);
      if (targetSection) await handleSaveSection(targetSection);

    } catch (error: any) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const moveSection = async (index: number, direction: "up" | "down") => {
    const newSections = [...sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    
    // Update orders
    const updatedSections = newSections.map((s, i) => ({ ...s, ordem: i }));
    setSections(updatedSections);

    setSaving(true);
    const promises = updatedSections.map(s => {
      if (s.isNew) return Promise.resolve(); // Não move seções ainda não salvas no banco
      return supabase.from("landing_sections").update({ ordem: s.ordem }).eq("id", s.id);
    });
    await Promise.all(promises);
    setSaving(false);
    toast({ title: "Ordem actualizada" });
  };

  const handleDeleteSection = async (section: LandingSection) => {
    if (section.isNew) {
      setSections(sections.filter(s => s.id !== section.id));
      return;
    }

    if (!confirm("Tem a certeza que deseja remover esta secção?")) return;

    setSaving(true);
    const { error } = await supabase
      .from("landing_sections")
      .delete()
      .eq("id", section.id);

    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Secção removida" });
      fetchData();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestão da Landing Page</h2>
          <p className="text-muted-foreground">Personalize o conteúdo, estilos e ordem das secções.</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={saving}>
          <RefreshCw className={`h-4 w-4 mr-2 ${saving ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>

      {sections.map((section, idx) => (
        <Card key={section.id} className={section.ativo ? "border-primary/20" : "opacity-60"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveSection(idx, "up")} disabled={idx === 0 || section.isNew}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveSection(idx, "down")} disabled={idx === sections.length - 1 || section.isNew}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layout className="h-5 w-5 text-primary" />
                  {section.tipo.toUpperCase()}: {section.titulo}
                  {section.isNew && <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded ml-2">Não salva</span>}
                </CardTitle>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 mr-4">
                <Label htmlFor={`active-${section.id}`} className="text-xs">Activa</Label>
                <Switch 
                  id={`active-${section.id}`} 
                  checked={section.ativo} 
                  onCheckedChange={(val) => {
                    const newSections = sections.map(s => s.id === section.id ? { ...s, ativo: val } : s);
                    setSections(newSections);
                    if (!section.isNew) handleSaveSection({ ...section, ativo: val });
                  }}
                />
              </div>
              <Button size="sm" variant="destructive" onClick={() => handleDeleteSection(section)} disabled={saving} className="mr-2">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => handleSaveSection(section)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />} Salvar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-4 mb-6">
              <div className="grid gap-1.5">
                <Label>Tipo de Secção</Label>
                <Select 
                  value={section.tipo} 
                  onValueChange={(val) => {
                    const newSections = sections.map(s => s.id === section.id ? { ...s, tipo: val } : s);
                    setSections(newSections);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hero">Hero (Principal)</SelectItem>
                    <SelectItem value="sobre">Sobre</SelectItem>
                    <SelectItem value="funcionalidades">Funcionalidades</SelectItem>
                    <SelectItem value="voce-sabia">Você Sabia?</SelectItem>
                    <SelectItem value="precos">Preços</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="content">
              <TabsList className="mb-4">
                <TabsTrigger value="content" className="gap-2"><Type className="h-4 w-4" /> Conteúdo</TabsTrigger>
                <TabsTrigger value="style" className="gap-2"><Palette className="h-4 w-4" /> Estilo & Animação</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                <div className="grid gap-2">
                  <Label>Título da Secção</Label>
                  <Input 
                    value={section.titulo} 
                    onChange={(e) => {
                      const newSections = sections.map(s => s.id === section.id ? { ...s, titulo: e.target.value } : s);
                      setSections(newSections);
                    }}
                  />
                </div>

                {section.tipo === 'sobre' && (
                  <div className="space-y-6 border-t pt-4 mt-4">
                    {section.conteudo.rows?.map((row: any, rIdx: number) => (
                      <div key={rIdx} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-muted/30">
                        <div className="space-y-3">
                          <div className="grid gap-1.5">
                            <Label className="text-xs">Badge (Texto pequeno acima)</Label>
                            <Input 
                              value={row.badge} 
                              onChange={(e) => {
                                const newRows = [...section.conteudo.rows];
                                newRows[rIdx].badge = e.target.value;
                                setSections(sections.map(s => s.id === section.id ? { ...s, conteudo: { ...s.conteudo, rows: newRows } } : s));
                              }}
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-xs">Título da Linha</Label>
                            <Input 
                              value={row.title} 
                              onChange={(e) => {
                                const newRows = [...section.conteudo.rows];
                                newRows[rIdx].title = e.target.value;
                                setSections(sections.map(s => s.id === section.id ? { ...s, conteudo: { ...s.conteudo, rows: newRows } } : s));
                              }}
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-xs">Texto / Descrição</Label>
                            <Textarea 
                              value={row.text} 
                              rows={4}
                              onChange={(e) => {
                                const newRows = [...section.conteudo.rows];
                                newRows[rIdx].text = e.target.value;
                                setSections(sections.map(s => s.id === section.id ? { ...s, conteudo: { ...s.conteudo, rows: newRows } } : s));
                              }}
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-xs">Imagem</Label>
                          <div className="relative aspect-video rounded-md overflow-hidden border bg-background group">
                            {row.image ? (
                              <img src={row.image} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">Sem imagem</div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button size="sm" variant="secondary" onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file) handleImageUpload(section.id, ['rows', rIdx.toString(), 'image'], file);
                                };
                                input.click();
                              }}>
                                <ImagePlus className="h-4 w-4 mr-2" /> Alterar Imagem
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <Switch 
                              id={`reverse-${section.id}-${rIdx}`}
                              checked={row.reverse}
                              onCheckedChange={(val) => {
                                const newRows = [...section.conteudo.rows];
                                newRows[rIdx].reverse = val;
                                setSections(sections.map(s => s.id === section.id ? { ...s, conteudo: { ...s.conteudo, rows: newRows } } : s));
                              }}
                            />
                            <Label htmlFor={`reverse-${section.id}-${rIdx}`} className="text-xs">Inverter ordem (Imagem à esquerda)</Label>
                          </div>
                          <Button variant="ghost" size="sm" className="text-destructive w-full mt-2" onClick={() => {
                            const newRows = section.conteudo.rows.filter((_: any, i: number) => i !== rIdx);
                            setSections(sections.map(s => s.id === section.id ? { ...s, conteudo: { ...s.conteudo, rows: newRows } } : s));
                          }}>
                            <Trash2 className="h-4 w-4 mr-2" /> Remover Linha
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full" onClick={() => {
                      const newRows = [...(section.conteudo.rows || []), { badge: "Novo", title: "Novo Título", text: "Descrição aqui...", image: "", reverse: false }];
                      setSections(sections.map(s => s.id === section.id ? { ...s, conteudo: { ...s.conteudo, rows: newRows } } : s));
                    }}>
                      <Plus className="h-4 w-4 mr-2" /> Adicionar Linha de Conteúdo
                    </Button>
                  </div>
                )}

                {section.tipo === 'funcionalidades' && (
                  <div className="space-y-4 border-t pt-4 mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {section.conteudo.items?.map((item: any, iIdx: number) => (
                        <div key={iIdx} className="p-4 border rounded-lg bg-muted/30 space-y-3 relative group">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-2 right-2 h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              const newItems = section.conteudo.items.filter((_: any, i: number) => i !== iIdx);
                              setSections(sections.map(s => s.id === section.id ? { ...s, conteudo: { ...s.conteudo, items: newItems } } : s));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div className="grid gap-1.5">
                            <Label className="text-xs">Ícone (Lucide Name)</Label>
                            <Input 
                              value={item.icon} 
                              onChange={(e) => {
                                const newItems = [...section.conteudo.items];
                                newItems[iIdx].icon = e.target.value;
                                setSections(sections.map(s => s.id === section.id ? { ...s, conteudo: { ...s.conteudo, items: newItems } } : s));
                              }}
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-xs">Título</Label>
                            <Input 
                              value={item.title} 
                              onChange={(e) => {
                                const newItems = [...section.conteudo.items];
                                newItems[iIdx].title = e.target.value;
                                setSections(sections.map(s => s.id === section.id ? { ...s, conteudo: { ...s.conteudo, items: newItems } } : s));
                              }}
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-xs">Descrição</Label>
                            <Textarea 
                              value={item.desc} 
                              rows={2}
                              onChange={(e) => {
                                const newItems = [...section.conteudo.items];
                                newItems[iIdx].desc = e.target.value;
                                setSections(sections.map(s => s.id === section.id ? { ...s, conteudo: { ...s.conteudo, items: newItems } } : s));
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => {
                      const newItems = [...(section.conteudo.items || []), { icon: "Zap", title: "Nova Funcionalidade", desc: "Descrição curta..." }];
                      setSections(sections.map(s => s.id === section.id ? { ...s, conteudo: { ...s.conteudo, items: newItems } } : s));
                    }}>
                      <Plus className="h-4 w-4 mr-2" /> Adicionar Item
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="style" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid gap-1.5">
                      <Label>Cor de Fundo</Label>
                      <Select 
                        value={section.conteudo.style?.bg || "default"} 
                        onValueChange={(val) => {
                          const newConteudo = { ...section.conteudo, style: { ...(section.conteudo.style || {}), bg: val } };
                          setSections(sections.map(s => s.id === section.id ? { ...s, conteudo: newConteudo } : s));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione a cor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Padrão (Background)</SelectItem>
                          <SelectItem value="card">Card (Levemente cinza/escuro)</SelectItem>
                          <SelectItem value="primary">Primária (Azul)</SelectItem>
                          <SelectItem value="muted">Muted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Animação de Entrada</Label>
                      <Select 
                        value={section.conteudo.style?.animation || "fade-up"} 
                        onValueChange={(val) => {
                          const newConteudo = { ...section.conteudo, style: { ...(section.conteudo.style || {}), animation: val } };
                          setSections(sections.map(s => s.id === section.id ? { ...s, conteudo: newConteudo } : s));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione a animação" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fade-up">Deslizar para Cima</SelectItem>
                          <SelectItem value="fade-in">Aparecer Suave</SelectItem>
                          <SelectItem value="slide-left">Deslizar da Esquerda</SelectItem>
                          <SelectItem value="slide-right">Deslizar da Direita</SelectItem>
                          <SelectItem value="zoom-in">Zoom In</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid gap-1.5">
                      <Label>Alinhamento do Texto</Label>
                      <div className="flex gap-2">
                        {['left', 'center', 'right'].map((align) => (
                          <Button 
                            key={align}
                            variant={section.conteudo.style?.textAlign === align ? "default" : "outline"}
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              const newConteudo = { ...section.conteudo, style: { ...(section.conteudo.style || {}), textAlign: align } };
                              setSections(sections.map(s => s.id === section.id ? { ...s, conteudo: newConteudo } : s));
                            }}
                          >
                            {align.charAt(0).toUpperCase() + align.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Colunas (Desktop)</Label>
                      <Select 
                        value={section.conteudo.style?.columns?.toString() || "2"} 
                        onValueChange={(val) => {
                          const newConteudo = { ...section.conteudo, style: { ...(section.conteudo.style || {}), columns: parseInt(val) } };
                          setSections(sections.map(s => s.id === section.id ? { ...s, conteudo: newConteudo } : s));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Nº de colunas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Coluna</SelectItem>
                          <SelectItem value="2">2 Colunas</SelectItem>
                          <SelectItem value="3">3 Colunas</SelectItem>
                          <SelectItem value="4">4 Colunas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-center py-4">
        <Button variant="outline" className="gap-2 border-dashed w-full max-w-md" onClick={() => {
          const newSection = {
            id: Math.random().toString(36).slice(2, 11),
            tipo: "sobre",
            titulo: "Nova Secção",
            conteudo: { rows: [], style: { bg: "default", animation: "fade-up" } },
            ordem: sections.length,
            ativo: true,
            isNew: true
          };
          setSections([...sections, newSection as any]);
        }}>
          <Plus className="h-4 w-4" /> Adicionar Nova Secção à Landing Page
        </Button>
      </div>
    </div>
  );
};

export default AdminLandingTab;
