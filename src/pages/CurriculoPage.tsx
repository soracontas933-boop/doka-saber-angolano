import React, { useRef, useState } from "react";
import { FileText, Download, Save, Palette, LayoutGrid, Check, Sparkles, ArrowLeft, Image as ImageIcon, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import CVForm from "@/components/cv/CVForm";
import CVPreview from "@/components/cv/CVPreview";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { CVData, CVTemplate } from "@/types/cv";
import { emptyCVData } from "@/types/cv";
import { cvThemes } from "@/lib/cv-themes";
import { exportCVToPdf, exportCVToWord } from "@/lib/cv-export";
import { saveProject } from "@/lib/save-project";
import { useUsageTracker } from "@/hooks/use-usage-tracker";
import { CREDIT_COSTS } from "@/lib/credit-costs";
import { toast } from "sonner";

const templates: { id: CVTemplate; label: string; desc: string }[] = [
  { id: "moderno", label: "Moderno", desc: "Sidebar lateral colorida" },
  { id: "classico", label: "Clássico", desc: "Tradicional e formal" },
  { id: "minimalista", label: "Minimalista", desc: "Limpo e elegante" },
  { id: "executivo", label: "Executivo", desc: "Cabeçalho marcante, 2 colunas" },
  { id: "criativo", label: "Criativo", desc: "Formas e timeline" },
  { id: "compacto", label: "Compacto", desc: "Denso e ATS-friendly" },
  { id: "elegante", label: "Elegante", desc: "Serifa, estilo refinado" },
  { id: "tecnologico", label: "Tecnológico", desc: "Estilo dev, monoespaçado" },
  { id: "corporativo", label: "Corporativo", desc: "Header com foto e barras de skill" },
  { id: "vibrante", label: "Vibrante", desc: "Sidebar escura com badges coloridos" },
  { id: "premium", label: "Premium", desc: "Cartão refinado com serifa e accent" },
];

const CV_COST = CREDIT_COSTS.cv;

const CurriculoPage: React.FC = () => {
  const [cvData, setCvData] = useLocalStorage<CVData>("delle-cv-data", emptyCVData);
  const [template, setTemplate] = useLocalStorage<CVTemplate>("delle-cv-template", "moderno");
  const [themeId, setThemeId] = useLocalStorage<string>("delle-cv-theme", "navy");
  const [generated, setGenerated] = useLocalStorage<boolean>("delle-cv-generated", false);
  const [editTab, setEditTab] = useState<string>("dados");
  const [generating, setGenerating] = useState(false);
  const [formErrors, setFormErrors] = useState<{ nomeCompleto?: boolean; titulo?: boolean }>({});
  const photoRef = useRef<HTMLInputElement>(null);

  const { checkLimit, logUsage } = useUsageTracker();
  const currentTheme = cvThemes.find((t) => t.id === themeId) || cvThemes[0];

  const canGenerate = cvData.nomeCompleto.trim().length > 1 && cvData.titulo.trim().length > 0;

  const handleGenerate = async () => {
    const errs: { nomeCompleto?: boolean; titulo?: boolean } = {};
    if (cvData.nomeCompleto.trim().length < 2) errs.nomeCompleto = true;
    if (cvData.titulo.trim().length < 1) errs.titulo = true;

    if (errs.nomeCompleto || errs.titulo) {
      setFormErrors(errs);
      toast.error("Preencha os campos obrigatórios destacados em vermelho.");
      // Garante que o accordion de Dados Pessoais esteja aberto e dá foco ao primeiro campo
      setTimeout(() => {
        const firstKey = errs.nomeCompleto ? "nomeCompleto" : "titulo";
        const el = document.querySelector<HTMLInputElement>(`[data-cv-field="${firstKey}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus({ preventScroll: true });
        }
      }, 50);
      return;
    }

    setFormErrors({});
    
    // Validar créditos ANTES de iniciar a geração
    const ok = await checkLimit("cv");
    if (!ok) return;

    setGenerating(true);
    try {
      // IMPORTANTE: Debitar créditos ANTES de exibir resultado
      const logSuccess = await logUsage("cv", "cv-builder");
      if (!logSuccess) {
        toast.error("Não foi possível debitar os créditos. O CV não foi salvo.");
        setGenerating(false);
        return;
      }
      
      // Só após débito bem-sucedido, marcar como gerado
      setGenerated(true);
      setEditTab("modelo");
      toast.success(`CV gerado com sucesso! (-${CV_COST} créditos debitados)`);
    } catch (e) {
      toast.error("Erro ao gerar CV.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!cvData.nomeCompleto) {
      toast.error("Preencha pelo menos o nome completo.");
      return;
    }
    await saveProject("trabalho", `CV - ${cvData.nomeCompleto}`, cvData as any);
  };

  const handleChangePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCvData({ ...cvData, foto: reader.result as string });
    reader.readAsDataURL(file);
  };

  /* ─────────── ETAPA 1: Formulário + botão Gerar ─────────── */
  if (!generated) {
    return (
      <div className="min-h-screen max-w-3xl mx-auto pb-32">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Criar Currículo</h1>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Preencha os seus dados. Depois clique em <strong>Gerar CV</strong> para criar o currículo
          ({CV_COST} créditos). Poderá editar, mudar modelo, cores, fonte e exportar em seguida.
        </p>

        <CVForm
          data={cvData}
          onChange={(d) => {
            setCvData(d);
            if (formErrors.nomeCompleto && d.nomeCompleto.trim().length >= 2) {
              setFormErrors((p) => ({ ...p, nomeCompleto: false }));
            }
            if (formErrors.titulo && d.titulo.trim().length >= 1) {
              setFormErrors((p) => ({ ...p, titulo: false }));
            }
          }}
          errors={formErrors}
        />

        {/* Sticky CTA bar */}
        <div className="fixed bottom-0 left-0 right-0 md:left-[var(--sidebar-width,16rem)] bg-background/95 backdrop-blur border-t border-border p-4 z-40">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="text-sm">
              <div className="font-semibold">Gerar CV</div>
              <div className="text-muted-foreground text-xs">
                {canGenerate ? `Custa ${CV_COST} créditos` : "Preenche o nome e o título profissional"}
              </div>
            </div>
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={generating}
              className="min-w-[170px]"
              title={!canGenerate ? "Preenche o nome e o título profissional" : undefined}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {generating ? "A gerar..." : `Gerar CV (${CV_COST})`}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────── ETAPA 2: CV gerado — editar / personalizar / exportar ─────────── */
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setGenerated(false)} title="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">CV — {cvData.nomeCompleto || "Sem nome"}</h1>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Download className="h-4 w-4 mr-1" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportCVToPdf(cvData, template)}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCVToWord(cvData)}>Word (.docx)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" /> Guardar
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-4">
        {/* Painel de controlo */}
        <div className="space-y-3">
          <Tabs value={editTab} onValueChange={setEditTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="dados">Editar</TabsTrigger>
              <TabsTrigger value="modelo">Modelo</TabsTrigger>
              <TabsTrigger value="foto">Foto</TabsTrigger>
            </TabsList>

            <TabsContent value="dados">
              <div className="overflow-y-auto pr-2" style={{ maxHeight: "calc(100vh - 220px)" }}>
                <CVForm data={cvData} onChange={setCvData} />
              </div>
            </TabsContent>

            <TabsContent value="modelo" className="space-y-4 pt-2">
              {/* Modelo */}
              <div>
                <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" /> Modelo
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                      className={`text-left p-2 rounded-lg border-2 transition-all ${
                        template === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-1 text-sm font-medium">
                        {template === t.id && <Check className="h-3 w-3 text-primary" />}
                        {t.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cores */}
              <div>
                <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Palette className="h-4 w-4" /> Cor — {currentTheme.label}
                </div>
                <div className="grid grid-cols-8 gap-2">
                  {cvThemes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setThemeId(t.id)}
                      title={t.label}
                      className={`aspect-square rounded-md border-2 transition-all ${
                        themeId === t.id ? "border-primary scale-110" : "border-border hover:border-primary/50"
                      }`}
                      style={{ backgroundColor: t.primary }}
                    >
                      {themeId === t.id && <Check className="m-auto h-3 w-3 text-white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo de letra (info — controlado pelo template) */}
              <div className="text-xs text-muted-foreground border border-border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <Type className="h-3.5 w-3.5" />
                  <strong>Tipo de letra</strong>
                </div>
                Cada modelo já vem com a tipografia ideal (sans, serifa ou monoespaçado).
                Mude o modelo acima para alterar a fonte do CV.
              </div>
            </TabsContent>

            <TabsContent value="foto" className="pt-2 space-y-3">
              <div className="text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Foto de perfil
              </div>
              <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-3">
                {cvData.foto ? (
                  <img src={cvData.foto} alt="Foto" className="w-32 h-32 rounded-full object-cover border-4 border-primary/20" />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <input ref={photoRef} type="file" accept="image/*" hidden onChange={handleChangePhoto} />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => photoRef.current?.click()}>
                    {cvData.foto ? "Trocar foto" : "Carregar foto"}
                  </Button>
                  {cvData.foto && (
                    <Button size="sm" variant="ghost" onClick={() => setCvData({ ...cvData, foto: undefined })}>
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Pré-visualização */}
        <div className="overflow-auto border rounded-xl bg-muted/30 p-2" style={{ maxHeight: "calc(100vh - 140px)" }}>
          <div id="cv-preview-capture">
            <CVPreview data={cvData} template={template} themeId={themeId} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurriculoPage;
