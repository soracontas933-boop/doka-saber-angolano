import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  RefreshCw,
  Video,
  Move,
  Maximize,
  Eye,
  Settings2,
  Layers,
  Play
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";

interface ElementBlock {
  id: string;
  type: 'text' | 'image' | 'video' | 'button';
  content: string;
  style: {
    x: number; // 0-100 percentage
    y: number; // 0-100 percentage
    width: number; // 0-100 percentage
    height?: number;
    fontSize?: number;
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    borderRadius?: number;
    zIndex: number;
    animation?: string;
    delay?: number;
    duration?: number;
  };
}

interface LandingSection {
  id: string;
  tipo: string;
  titulo: string;
  conteudo: {
    blocks: ElementBlock[];
    style: {
      bg: string;
      height: string;
      overlay?: number;
    };
  };
  ordem: number;
  ativo: boolean;
  isNew?: boolean;
}

const AdminLandingTab = () => {
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("landing_sections")
      .select("*")
      .order("ordem", { ascending: true });

    if (error) {
      toast({ title: "Erro ao carregar secções", description: error.message, variant: "destructive" });
    } else {
      // Garantir que a estrutura de blocos existe para seções antigas
      const normalizedData = (data || []).map((s: any) => {
        const conteudo = (typeof s.conteudo === "object" && s.conteudo !== null) ? s.conteudo : {};
        if (!conteudo.blocks) {
          return {
            ...s,
            conteudo: {
              blocks: [],
              style: conteudo.style || { bg: "default", height: "auto" },
            },
          };
        }
        return { ...s, conteudo };
      });
      setSections(normalizedData as any);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSection = async (section: LandingSection) => {
    setSaving(true);
    const sectionData: any = {
      tipo: section.tipo,
      titulo: section.titulo,
      conteudo: section.conteudo,
      ativo: section.ativo,
      ordem: section.ordem,
      atualizado_em: new Date().toISOString()
    };

    if (!section.isNew) {
      sectionData.id = section.id;
    }

    const { error } = await supabase.from("landing_sections").upsert(sectionData);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Secção salva com sucesso" });
      fetchData();
    }
    setSaving(false);
  };

  const handleImageUpload = async (sectionId: string, blockId: string, file: File) => {
    setUploading(blockId);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("landing-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("landing-images").getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      setSections(prev => prev.map(s => {
        if (s.id === sectionId) {
          return {
            ...s,
            conteudo: {
              ...s.conteudo,
              blocks: s.conteudo.blocks.map(b => b.id === blockId ? { ...b, content: publicUrl } : b)
            }
          };
        }
        return s;
      }));
    } catch (error: any) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const addBlock = (sectionId: string, type: ElementBlock['type']) => {
    const newBlock: ElementBlock = {
      id: Math.random().toString(36).slice(2, 11),
      type,
      content: type === 'text' ? 'Novo Texto' : type === 'button' ? 'Clique Aqui' : '',
      style: {
        x: 10,
        y: 10,
        width: type === 'text' ? 80 : 30,
        zIndex: 1,
        fontSize: type === 'text' ? 16 : 14,
        animation: 'fade-up',
        delay: 0,
        duration: 0.5
      }
    };

    setSections(prev => prev.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          conteudo: {
            ...s.conteudo,
            blocks: [...s.conteudo.blocks, newBlock]
          }
        };
      }
      return s;
    }));
    setSelectedBlockId(newBlock.id);
  };

  const updateBlock = (sectionId: string, blockId: string, updates: Partial<ElementBlock>) => {
    setSections(prev => prev.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          conteudo: {
            ...s.conteudo,
            blocks: s.conteudo.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b)
          }
        };
      }
      return s;
    }));
  };

  const updateBlockStyle = (sectionId: string, blockId: string, styleUpdates: Partial<ElementBlock['style']>) => {
    setSections(prev => prev.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          conteudo: {
            ...s.conteudo,
            blocks: s.conteudo.blocks.map(b => b.id === blockId ? { ...b, style: { ...b.style, ...styleUpdates } } : b)
          }
        };
      }
      return s;
    }));
  };

  const removeBlock = (sectionId: string, blockId: string) => {
    setSections(prev => prev.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          conteudo: {
            ...s.conteudo,
            blocks: s.conteudo.blocks.filter(b => b.id !== blockId)
          }
        };
      }
      return s;
    }));
    setSelectedBlockId(null);
  };

  const activeSection = sections.find(s => s.id === activeSectionId);
  const selectedBlock = activeSection?.conteudo.blocks.find(b => b.id === selectedBlockId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-primary/10">
        <div>
          <h2 className="text-2xl font-bold">Construtor Visual de Landing Page</h2>
          <p className="text-muted-foreground text-sm">Arraste, redimensione e personalize cada elemento das suas secções.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={isPreviewMode ? "default" : "outline"} onClick={() => setIsPreviewMode(!isPreviewMode)}>
            <Eye className="h-4 w-4 mr-2" /> {isPreviewMode ? "Sair do Preview" : "Preview Real"}
          </Button>
          <Button variant="outline" onClick={fetchData} disabled={saving}>
            <RefreshCw className={`h-4 w-4 mr-2 ${saving ? "animate-spin" : ""}`} /> Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar: Lista de Secções */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="h-4 w-4" /> Secções da Página
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {sections.map((section, idx) => (
                <div 
                  key={section.id}
                  onClick={() => setActiveSectionId(section.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all flex items-center justify-between group ${
                    activeSectionId === section.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-xs opacity-50">#{idx + 1}</span>
                    <span className="truncate text-sm font-medium">{section.titulo || "Sem título"}</span>
                  </div>
                  {section.isNew && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                </div>
              ))}
              <Button 
                variant="outline" 
                className="w-full mt-2 border-dashed" 
                size="sm"
                onClick={() => {
                  const newId = Math.random().toString(36).slice(2, 11);
                  const newSection: LandingSection = {
                    id: newId,
                    tipo: "custom",
                    titulo: "Nova Secção",
                    conteudo: { blocks: [], style: { bg: "default", height: "500px" } },
                    ordem: sections.length,
                    ativo: true,
                    isNew: true
                  };
                  setSections([...sections, newSection]);
                  setActiveSectionId(newId);
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Nova Secção
              </Button>
            </CardContent>
          </Card>

          {activeSection && (
            <Card className="border-primary/20">
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-bold">Configuração da Secção</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Título Interno</Label>
                  <Input 
                    value={activeSection.titulo} 
                    onChange={(e) => setSections(prev => prev.map(s => s.id === activeSection.id ? { ...s, titulo: e.target.value } : s))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Cor de Fundo</Label>
                  <Select 
                    value={activeSection.conteudo.style.bg} 
                    onValueChange={(val) => setSections(prev => prev.map(s => s.id === activeSection.id ? { ...s, conteudo: { ...s.conteudo, style: { ...s.conteudo.style, bg: val } } } : s))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Padrão</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="primary">Primário</SelectItem>
                      <SelectItem value="muted">Muted</SelectItem>
                      <SelectItem value="black">Preto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Altura Mínima (px)</Label>
                  <Input 
                    value={activeSection.conteudo.style.height.replace('px', '')} 
                    type="number"
                    onChange={(e) => setSections(prev => prev.map(s => s.id === activeSection.id ? { ...s, conteudo: { ...s.conteudo, style: { ...s.conteudo.style, height: `${e.target.value}px` } } } : s))}
                  />
                </div>
                <Button className="w-full" size="sm" onClick={() => handleSaveSection(activeSection)} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />} Salvar Secção
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Editor Central / Preview */}
        <div className="lg:col-span-6 space-y-4">
          {activeSection ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg">
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-8" onClick={() => addBlock(activeSection.id, 'text')}><Type className="h-4 w-4 mr-1" /> Texto</Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => addBlock(activeSection.id, 'image')}><ImagePlus className="h-4 w-4 mr-1" /> Imagem</Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => addBlock(activeSection.id, 'video')}><Video className="h-4 w-4 mr-1" /> Vídeo</Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => addBlock(activeSection.id, 'button')}><Sparkles className="h-4 w-4 mr-1" /> Botão</Button>
                </div>
                <div className="text-xs font-medium text-muted-foreground px-2">
                  {activeSection.conteudo.blocks.length} elementos
                </div>
              </div>

              {/* Área de Edição Visual */}
              <div 
                className={`relative rounded-xl border-2 border-dashed overflow-hidden transition-all bg-background ${
                  activeSection.conteudo.style.bg === 'card' ? 'bg-card' : 
                  activeSection.conteudo.style.bg === 'primary' ? 'bg-primary/5' : 
                  activeSection.conteudo.style.bg === 'black' ? 'bg-black' : 'bg-background'
                }`}
                style={{ minHeight: activeSection.conteudo.style.height }}
              >
                {activeSection.conteudo.blocks.map(block => (
                  <motion.div
                    key={block.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); }}
                    initial={isPreviewMode ? { opacity: 0, y: 20 } : false}
                    animate={isPreviewMode ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: block.style.delay, duration: block.style.duration }}
                    className={`absolute cursor-move group ${selectedBlockId === block.id ? "ring-2 ring-primary z-[100]" : "hover:ring-1 hover:ring-primary/50"}`}
                    style={{
                      left: `${block.style.x}%`,
                      top: `${block.style.y}%`,
                      width: `${block.style.width}%`,
                      zIndex: block.style.zIndex,
                    }}
                  >
                    {/* Renderização do Bloco */}
                    {block.type === 'text' && (
                      <div 
                        style={{ 
                          fontSize: `${block.style.fontSize}px`, 
                          textAlign: block.style.textAlign,
                          color: activeSection.conteudo.style.bg === 'black' ? 'white' : 'inherit'
                        }}
                        className="p-2 font-display font-medium"
                      >
                        {block.content}
                      </div>
                    )}
                    {block.type === 'image' && (
                      <div className="p-1">
                        {block.content ? (
                          <img src={block.content} className="w-full h-auto rounded-lg shadow-sm" />
                        ) : (
                          <div className="bg-muted aspect-video rounded-lg flex items-center justify-center text-xs text-muted-foreground">Sem imagem</div>
                        )}
                      </div>
                    )}
                    {block.type === 'video' && (
                      <div className="p-1 aspect-video bg-black rounded-lg flex items-center justify-center overflow-hidden">
                        {block.content ? (
                          <div className="text-white text-[10px] truncate px-2">{block.content}</div>
                        ) : (
                          <Video className="text-white/20 h-8 w-8" />
                        )}
                      </div>
                    )}
                    {block.type === 'button' && (
                      <div className="p-2 flex" style={{ justifyContent: block.style.textAlign === 'center' ? 'center' : block.style.textAlign === 'right' ? 'flex-end' : 'flex-start' }}>
                        <Button size="sm" className="rounded-full shadow-lg">{block.content}</Button>
                      </div>
                    )}

                    {/* Controles de Movimento (apenas em modo edição) */}
                    {!isPreviewMode && selectedBlockId === block.id && (
                      <div className="absolute -top-8 left-0 flex gap-1 bg-primary rounded-md p-1 shadow-xl">
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-white" onClick={() => removeBlock(activeSection.id, block.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-white"><Move className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Grid de Ajuda */}
                {!isPreviewMode && (
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03] grid grid-cols-10 grid-rows-10">
                    {Array.from({ length: 100 }).map((_, i) => <div key={i} className="border border-foreground" />)}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border-2 border-dashed">
              <Layout className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground font-medium">Seleccione uma secção para editar</p>
            </div>
          )}
        </div>

        {/* Inspector: Propriedades do Bloco */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Inspector de Elemento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {selectedBlock && activeSection ? (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Conteúdo</Label>
                    {selectedBlock.type === 'text' || selectedBlock.type === 'button' ? (
                      <Textarea 
                        value={selectedBlock.content} 
                        rows={3}
                        onChange={(e) => updateBlock(activeSection.id, selectedBlock.id, { content: e.target.value })}
                        className="text-sm"
                      />
                    ) : selectedBlock.type === 'image' ? (
                      <div className="space-y-2">
                        <Input 
                          value={selectedBlock.content} 
                          placeholder="URL da imagem ou faça upload"
                          onChange={(e) => updateBlock(activeSection.id, selectedBlock.id, { content: e.target.value })}
                        />
                        <Button variant="outline" className="w-full" size="sm" onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleImageUpload(activeSection.id, selectedBlock.id, file);
                          };
                          input.click();
                        }}>
                          {uploading === selectedBlock.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-2" />} Carregar Imagem
                        </Button>
                      </div>
                    ) : (
                      <Input 
                        value={selectedBlock.content} 
                        placeholder="URL do vídeo (YouTube/Vimeo)"
                        onChange={(e) => updateBlock(activeSection.id, selectedBlock.id, { content: e.target.value })}
                      />
                    )}
                  </div>

                  <div className="space-y-4">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Posição e Tamanho</Label>
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <div className="flex justify-between text-[10px] font-bold"><span>Horizontal (X): {selectedBlock.style.x}%</span></div>
                        <Slider value={[selectedBlock.style.x]} onValueChange={([v]) => updateBlockStyle(activeSection.id, selectedBlock.id, { x: v })} max={100} step={1} />
                      </div>
                      <div className="grid gap-2">
                        <div className="flex justify-between text-[10px] font-bold"><span>Vertical (Y): {selectedBlock.style.y}%</span></div>
                        <Slider value={[selectedBlock.style.y]} onValueChange={([v]) => updateBlockStyle(activeSection.id, selectedBlock.id, { y: v })} max={100} step={1} />
                      </div>
                      <div className="grid gap-2">
                        <div className="flex justify-between text-[10px] font-bold"><span>Largura: {selectedBlock.style.width}%</span></div>
                        <Slider value={[selectedBlock.style.width]} onValueChange={([v]) => updateBlockStyle(activeSection.id, selectedBlock.id, { width: v })} max={100} step={1} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Animação</Label>
                    <div className="grid gap-3">
                      <Select value={selectedBlock.style.animation} onValueChange={(val) => updateBlockStyle(activeSection.id, selectedBlock.id, { animation: val })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipo de animação" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          <SelectItem value="fade-up">Surgir (Cima)</SelectItem>
                          <SelectItem value="fade-in">Aparecer</SelectItem>
                          <SelectItem value="zoom-in">Zoom In</SelectItem>
                          <SelectItem value="slide-left">Deslizar Esquerda</SelectItem>
                          <SelectItem value="slide-right">Deslizar Direita</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="grid gap-1">
                          <Label className="text-[10px]">Delay (s)</Label>
                          <Input type="number" step="0.1" value={selectedBlock.style.delay} onChange={(e) => updateBlockStyle(activeSection.id, selectedBlock.id, { delay: parseFloat(e.target.value) })} className="h-8 text-xs" />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-[10px]">Duração (s)</Label>
                          <Input type="number" step="0.1" value={selectedBlock.style.duration} onChange={(e) => updateBlockStyle(activeSection.id, selectedBlock.id, { duration: parseFloat(e.target.value) })} className="h-8 text-xs" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedBlock.type === 'text' && (
                    <div className="space-y-3">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Estilo de Texto</Label>
                      <div className="grid gap-2">
                        <div className="flex justify-between text-[10px] font-bold"><span>Tamanho: {selectedBlock.style.fontSize}px</span></div>
                        <Slider value={[selectedBlock.style.fontSize || 16]} onValueChange={([v]) => updateBlockStyle(activeSection.id, selectedBlock.id, { fontSize: v })} min={8} max={120} step={1} />
                      </div>
                      <div className="flex gap-1">
                        {['left', 'center', 'right'].map(align => (
                          <Button 
                            key={align} 
                            variant={selectedBlock.style.textAlign === align ? "default" : "outline"} 
                            size="icon" className="h-8 w-8"
                            onClick={() => updateBlockStyle(activeSection.id, selectedBlock.id, { textAlign: align as any })}
                          >
                            <Type className="h-3 w-3" />
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center opacity-30">
                  <Move className="h-10 w-10 mb-2" />
                  <p className="text-xs">Seleccione um elemento na secção para editar as suas propriedades.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminLandingTab;
