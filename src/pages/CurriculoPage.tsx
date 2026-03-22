import React, { useState } from "react";
import { FileText, Download, Eye, Save, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CVForm from "@/components/cv/CVForm";
import CVPreview from "@/components/cv/CVPreview";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { CVData, CVTemplate } from "@/types/cv";
import { emptyCVData } from "@/types/cv";
import { exportCVToPdf, exportCVToWord } from "@/lib/cv-export";
import { saveProject } from "@/lib/save-project";
import { toast } from "sonner";

const templates: { id: CVTemplate; label: string; desc: string }[] = [
  { id: "moderno", label: "Moderno", desc: "Layout com sidebar lateral colorida" },
  { id: "classico", label: "Clássico", desc: "Design tradicional e formal" },
  { id: "minimalista", label: "Minimalista", desc: "Limpo e elegante" },
];

const CurriculoPage: React.FC = () => {
  const [cvData, setCvData] = useLocalStorage<CVData>("wame-cv-data", emptyCVData);
  const [template, setTemplate] = useLocalStorage<CVTemplate>("wame-cv-template", "moderno");
  const [mobileTab, setMobileTab] = useState<string>("form");

  const handleSave = async () => {
    if (!cvData.nomeCompleto) {
      toast.error("Preencha pelo menos o nome completo.");
      return;
    }
    await saveProject("trabalho", `CV - ${cvData.nomeCompleto}`, cvData as any);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Criar Currículo</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Template Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Palette className="h-4 w-4 mr-1" />
                {templates.find((t) => t.id === template)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {templates.map((t) => (
                <DropdownMenuItem key={t.id} onClick={() => setTemplate(t.id)}>
                  <div>
                    <div className="font-medium">{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.desc}</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Download className="h-4 w-4 mr-1" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportCVToPdf(cvData, template)}>
                PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCVToWord(cvData)}>
                Word (.docx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Guardar
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
                <CVPreview data={cvData} template={template} />
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
            <CVPreview data={cvData} template={template} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurriculoPage;
