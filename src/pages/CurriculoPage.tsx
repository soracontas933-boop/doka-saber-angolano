import React, { useState } from "react";
import { FileText, Download, Eye, Save, Palette, LayoutGrid, Check } from "lucide-react";
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
];

const CurriculoPage: React.FC = () => {
  const [cvData, setCvData] = useLocalStorage<CVData>("delle-cv-data", emptyCVData);
  const [template, setTemplate] = useLocalStorage<CVTemplate>("delle-cv-template", "moderno");
  const [themeId, setThemeId] = useLocalStorage<string>("delle-cv-theme", "navy");
  const [mobileTab, setMobileTab] = useState<string>("form");

  const handleSave = async () => {
    if (!cvData.nomeCompleto) {
      toast.error("Preencha pelo menos o nome completo.");
      return;
    }
    await saveProject("trabalho", `CV - ${cvData.nomeCompleto}`, cvData as any);
  };

  const currentTheme = cvThemes.find((t) => t.id === themeId) || cvThemes[0];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Criar Currículo</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Template selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <LayoutGrid className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Modelo:&nbsp;</span>
                {templates.find((t) => t.id === template)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto">
              <DropdownMenuLabel>Escolher modelo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {templates.map((t) => (
                <DropdownMenuItem key={t.id} onClick={() => setTemplate(t.id)} className="gap-2">
                  {template === t.id ? <Check className="h-4 w-4 text-primary" /> : <span className="w-4" />}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.desc}</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme/Color selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Palette className="h-4 w-4 mr-1" />
                <span
                  className="inline-block w-3 h-3 rounded-full mr-1 border border-border"
                  style={{ backgroundColor: currentTheme.primary }}
                />
                <span className="hidden sm:inline">{currentTheme.label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 max-h-96 overflow-y-auto">
              <DropdownMenuLabel>Tema / Cor ({cvThemes.length})</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="grid grid-cols-4 gap-2 p-2">
                {cvThemes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setThemeId(t.id)}
                    title={t.label}
                    className={`group relative aspect-square rounded-md border-2 transition-all ${
                      themeId === t.id ? "border-primary scale-110" : "border-border hover:border-primary/50"
                    }`}
                    style={{ backgroundColor: t.primary }}
                  >
                    {themeId === t.id && (
                      <Check className="absolute inset-0 m-auto h-4 w-4 text-white" strokeWidth={3} />
                    )}
                    <span className="sr-only">{t.label}</span>
                  </button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
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

      {/* Mobile tabs */}
      <div className="md:hidden mb-4">
        <Tabs value={mobileTab} onValueChange={setMobileTab}>
          <TabsList className="w-full">
            <TabsTrigger value="form" className="flex-1">Formulário</TabsTrigger>
            <TabsTrigger value="preview" className="flex-1">
              <Eye className="h-4 w-4 mr-1" /> Pré-visualização
            </TabsTrigger>
          </TabsList>
          <TabsContent value="form">
            <CVForm data={cvData} onChange={setCvData} />
          </TabsContent>
          <TabsContent value="preview">
            <div className="overflow-auto border rounded-xl bg-muted/30 p-2" style={{ maxHeight: "80vh" }}>
              <div id="cv-preview-capture">
                <CVPreview data={cvData} template={template} themeId={themeId} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop side-by-side */}
      <div className="hidden md:grid md:grid-cols-2 gap-4">
        <div className="overflow-y-auto pr-2" style={{ maxHeight: "calc(100vh - 120px)" }}>
          <CVForm data={cvData} onChange={setCvData} />
        </div>
        <div className="overflow-auto border rounded-xl bg-muted/30 p-2" style={{ maxHeight: "calc(100vh - 120px)" }}>
          <div id="cv-preview-capture">
            <CVPreview data={cvData} template={template} themeId={themeId} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurriculoPage;
