import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Eye,
  RefreshCw,
  Settings2,
  Layers,
  Save,
  Copy,
  Trash
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import EditorCanvas from "./EditorCanvas";
import ElementLibrary from "./ElementLibrary";
import BlockPropertiesPanel from "./BlockPropertiesPanel";
import { LandingSection, ElementBlock, ElementBlockType } from "@/types/editor";

const AdminLandingTabNew = () => {
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
      const normalizedData = (data || []).map((s: any) => {
        const conteudo = (typeof s.conteudo === "object" && s.conteudo !== null) ? s.conteudo : {};
        if (!conteudo.blocks) {
          return {
            ...s,
            conteudo: {
              blocks: [],
              style: conteudo.style || { bg: "default", height: "500px" },
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

  const handleImageUpload = async (blockId: string, file: File): Promise<string> => {
    setUploading(blockId);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("landing-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("landing-images").getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error: any) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
      throw error;
    } finally {
      setUploading(null);
    }
  };

  const addBlock = (sectionId: string, type: ElementBlockType, icon?: string) => {
    const newBlock: ElementBlock = {
      id: Math.random().toString(36).slice(2, 11),
      type,
      content: {
        text: type === 'text' ? 'Novo Texto' : undefined,
        buttonText: type === 'button' ? 'Clique Aqui' : undefined,
        iconName: icon,
      },
      style: {
        x: 10,
        y: 10,
        width: type === 'text' ? 80 : type === 'image' ? 40 : 30,
        height: type === 'image' ? 40 : undefined,
        zIndex: 1,
        fontSize: type === 'text' ? 16 : 14,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 400,
        color: '#000000',
        backgroundColor: type === 'button' ? '#3b82f6' : 'transparent',
        borderRadius: type === 'button' ? 24 : 0,
        animation: 'fade-up',
        animationDuration: 0.6,
        animationDelay: 0,
        animationEasing: 'ease-out',
      },
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

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const idx = sections.findIndex(s => s.id === sectionId);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sections.length - 1)) return;

    const newSections = [...sections];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newSections[idx], newSections[targetIdx]] = [newSections[targetIdx], newSections[idx]];

    newSections.forEach((s, i) => s.ordem = i);
    setSections(newSections);
  };

  const duplicateSection = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const newSection: LandingSection = {
      ...section,
      id: Math.random().toString(36).slice(2, 11),
      ordem: sections.length,
      isNew: true,
      conteudo: {
        ...section.conteudo,
        blocks: section.conteudo.blocks.map(b => ({
          ...b,
          id: Math.random().toString(36).slice(2, 11)
        }))
      }
    };

    setSections([...sections, newSection]);
    setActiveSectionId(newSection.id);
  };

  const removeSection = (sectionId: string) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
    setActiveSectionId(null);
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
      {/* Header */}
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-primary/10">
        <div>
          <h2 className="text-2xl font-bold">Construtor Visual de Landing Page</h2>
          <p className="text-muted-foreground text-sm">Arraste, redimensione e personalize cada elemento das suas secções com mais de 100 elementos e 20+ fontes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={isPreviewMode ? "default" : "outline"} onClick={() => setIsPreviewMode(!isPreviewMode)}>
            <Eye className="h-4 w-4 mr-2" /> {isPreviewMode ? "Sair" : "Preview"}
          </Button>
          <Button 
            variant="default" 
            onClick={() => activeSection && handleSaveSection(activeSection)} 
            disabled={saving || !activeSection}
          >
            <Save className={`h-4 w-4 mr-2 ${saving ? "animate-spin" : ""}`} /> Salvar
          </Button>
          <Button variant="outline" onClick={fetchData} disabled={saving}>
            <RefreshCw className={`h-4 w-4 mr-2 ${saving ? "animate-spin" : ""}`} /> Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar: Lista de Secções */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="h-full">
            <CardHeader className="p-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" /> Secções
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto">
              {sections.map((section, idx) => (
                <div 
                  key={section.id}
                  className={`p-2 rounded-lg cursor-pointer transition-all text-xs group ${
                    activeSectionId === section.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex-1 min-w-0" onClick={() => setActiveSectionId(section.id)}>
                      <div className="truncate font-medium">{section.titulo || "Sem título"}</div>
                      <div className="text-[10px] opacity-70">{section.conteudo.blocks.length} elementos</div>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => moveSection(section.id, 'up')}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => moveSection(section.id, 'down')}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                className="w-full mt-2 border-dashed text-xs" 
                size="sm"
                onClick={() => {
                  const newId = Math.random().toString(36).slice(2, 11);
                  const newSection: LandingSection = {
                    id: newId,
                    tipo: "custom",
                    titulo: "Nova Secção",
                    conteudo: { 
                      blocks: [], 
                      style: { bg: "default", height: "500px" } 
                    },
                    ordem: sections.length,
                    ativo: true,
                    isNew: true
                  };
                  setSections([...sections, newSection]);
                  setActiveSectionId(newId);
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Nova
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Editor Principal */}
        <div className="lg:col-span-7 space-y-4">
          {activeSection ? (
            <>
              {/* Configurações da Secção */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings2 className="h-4 w-4" /> Configurações da Secção
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Título</Label>
                      <Input
                        value={activeSection.titulo}
                        onChange={(e) => setSections(prev => prev.map(s => s.id === activeSection.id ? { ...s, titulo: e.target.value } : s))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Altura</Label>
                      <Input
                        value={activeSection.conteudo.style.height || '500px'}
                        onChange={(e) => setSections(prev => prev.map(s => s.id === activeSection.id ? { ...s, conteudo: { ...s.conteudo, style: { ...s.conteudo.style, height: e.target.value } } } : s))}
                        className="h-8 text-xs"
                        placeholder="500px"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Cor de Fundo</Label>
                      <Select value={activeSection.conteudo.style.bg || 'default'} onValueChange={(val) => setSections(prev => prev.map(s => s.id === activeSection.id ? { ...s, conteudo: { ...s.conteudo, style: { ...s.conteudo.style, bg: val } } } : s))}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Padrão</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="primary">Primária</SelectItem>
                          <SelectItem value="muted">Muted</SelectItem>
                          <SelectItem value="black">Preto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ativo</Label>
                      <div className="flex items-center gap-2 h-8">
                        <Switch
                          checked={activeSection.ativo}
                          onCheckedChange={(checked) => setSections(prev => prev.map(s => s.id === activeSection.id ? { ...s, ativo: checked } : s))}
                        />
                        <span className="text-xs">{activeSection.ativo ? 'Visível' : 'Oculto'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Canvas de Edição */}
              <EditorCanvas
                section={activeSection}
                selectedBlockId={selectedBlockId}
                onBlockSelect={setSelectedBlockId}
                onBlockUpdate={(blockId, updates) => updateBlock(activeSection.id, blockId, updates)}
                onBlockRemove={(blockId) => removeBlock(activeSection.id, blockId)}
                isPreviewMode={isPreviewMode}
              />

              {/* Ações da Secção */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => duplicateSection(activeSection.id)}
                >
                  <Copy className="h-3 w-3 mr-1" /> Duplicar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => removeSection(activeSection.id)}
                >
                  <Trash className="h-3 w-3 mr-1" /> Remover
                </Button>
              </div>
            </>
          ) : (
            <Card className="h-64 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">Selecione uma secção para começar a editar</p>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar Direita: Biblioteca e Propriedades */}
        <div className="lg:col-span-3 space-y-4">
          {activeSection && (
            <>
              <ElementLibrary onAddElement={(type, icon) => addBlock(activeSection.id, type, icon)} />
              {selectedBlock && (
                <BlockPropertiesPanel
                  block={selectedBlock}
                  onBlockUpdate={(updates) => updateBlock(activeSection.id, selectedBlock.id, updates)}
                  onBlockRemove={() => removeBlock(activeSection.id, selectedBlock.id)}
                  onImageUpload={(file) => handleImageUpload(selectedBlock.id, file)}
                  uploading={uploading === selectedBlock.id}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLandingTabNew;
