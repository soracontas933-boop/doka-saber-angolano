import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Download, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LandingContent {
  stats: Array<{ label: string; value: string; icon: string }>;
  features: Array<{ icon: string; title: string; description: string; badge: string }>;
  steps: Array<{ number: number; title: string; description: string; icon: string }>;
  testimonials: Array<{ name: string; school: string; text: string; avatar: string }>;
  pricing: Array<{ name: string; price: string; description: string; features: string[]; popular: boolean }>;
  partners: Array<{ name: string; logo: string }>;
  faq: Array<{ question: string; answer: string }>;
  journey: { title: string; text: string; story: string; cta: string };
  cta: { title: string; subtitle: string; buttonText: string };
}

interface AdminLandingPanelFloatProps {
  content: LandingContent;
  onUpdateContent: (section: keyof LandingContent, data: any) => void;
  onClose: () => void;
}

const AdminLandingPanelFloat = ({ content, onUpdateContent, onClose }: AdminLandingPanelFloatProps) => {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSaveContent = async () => {
    setSaving(true);
    try {
      // Salvar conteúdo na tabela de configurações
      const { error } = await supabase
        .from("site_settings")
        .upsert({
          chave: "landing_page_content",
          valor: JSON.stringify(content),
          atualizado_em: new Date().toISOString()
        }, { onConflict: "chave" });

      if (error) throw error;
      toast({ title: "Conteúdo salvo com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleExportHTML = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-AO">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delle - Plataforma Educacional Angolana</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; line-height: 1.6; color: #1d1d1f; }
    .container { max-width: 1280px; margin: 0 auto; padding: 0 1rem; }
    section { padding: 4rem 0; }
    h2 { font-size: 2.5rem; font-weight: 700; margin-bottom: 1rem; }
    p { color: #666; }
    .grid { display: grid; gap: 1.5rem; }
    .grid-2 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
    .card { padding: 1.5rem; border: 1px solid #e5e5e7; border-radius: 1rem; }
    .btn { display: inline-block; padding: 0.75rem 1.5rem; background: #007aff; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; text-align: center; }
    .stat-value { font-size: 2rem; font-weight: 700; color: #007aff; }
  </style>
</head>
<body>
  <header style="padding: 1rem; border-bottom: 1px solid #e5e5e7;">
    <div class="container" style="display: flex; justify-content: space-between; align-items: center;">
      <h1>Delle</h1>
      <button class="btn">Começar Agora</button>
    </div>
  </header>

  <section style="background: linear-gradient(135deg, #007aff 0%, #5856d6 100%); color: white; text-align: center; padding: 6rem 0;">
    <div class="container">
      <h1 style="font-size: 3rem; margin-bottom: 1rem;">Aprenda mais, estude melhor</h1>
      <p style="font-size: 1.25rem; margin-bottom: 2rem; color: rgba(255,255,255,0.9);">Gere trabalhos escolares, resumos de conteúdo, questionários e planos de aula adaptados às normas de Angola.</p>
      <button class="btn" style="background: white; color: #007aff;">Começar Grátis</button>
    </div>
  </section>

  <section style="background: #f5f5f7;">
    <div class="container">
      <h2 style="text-align: center; margin-bottom: 3rem;">Números que Falam</h2>
      <div class="stats">
        ${content.stats.map(stat => `
          <div>
            <div class="stat-value">${stat.value}</div>
            <p>${stat.label}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <section>
    <div class="container">
      <h2 style="text-align: center; margin-bottom: 3rem;">Funcionalidades</h2>
      <div class="grid grid-2">
        ${content.features.map(feature => `
          <div class="card">
            <h3>${feature.title}</h3>
            <p>${feature.description}</p>
            <span style="display: inline-block; margin-top: 1rem; padding: 0.25rem 0.75rem; background: #f5f5f7; border-radius: 0.25rem; font-size: 0.875rem;">${feature.badge}</span>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <section style="background: #f5f5f7;">
    <div class="container">
      <h2 style="text-align: center; margin-bottom: 3rem;">Como Funciona</h2>
      <div class="grid grid-2">
        ${content.steps.map(step => `
          <div class="card">
            <h3 style="color: #007aff; margin-bottom: 0.5rem;">Passo ${step.number}</h3>
            <h4>${step.title}</h4>
            <p>${step.description}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <footer style="background: #1d1d1f; color: white; padding: 2rem; text-align: center;">
    <p>&copy; 2026 Delle. Todos os direitos reservados. Feito com ❤️ em Angola.</p>
  </footer>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "landing-page.html";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "HTML exportado com sucesso!" });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[50] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: "spring", damping: 20 }}
        className="fixed right-0 top-0 z-[51] h-screen w-full sm:w-96 bg-background border-l border-border/50 shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border/50 bg-background/95 backdrop-blur-sm">
          <h2 className="text-lg font-bold">Editar Landing Page</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          <Tabs defaultValue="stats" className="w-full">
	            <TabsList className="grid w-full grid-cols-6 mb-4">
	              <TabsTrigger value="stats" className="text-xs">Stats</TabsTrigger>
	              <TabsTrigger value="features" className="text-xs">Features</TabsTrigger>
	              <TabsTrigger value="pricing" className="text-xs">Preços</TabsTrigger>
	              <TabsTrigger value="journey" className="text-xs">Jornada</TabsTrigger>
	              <TabsTrigger value="testimonials" className="text-xs">Depoim.</TabsTrigger>
	              <TabsTrigger value="cta" className="text-xs">CTA</TabsTrigger>
	            </TabsList>

            {/* Stats Tab */}
            <TabsContent value="stats" className="space-y-4">
              <div className="space-y-3">
                {content.stats.map((stat, i) => (
                  <div key={i} className="p-3 border border-border/50 rounded-lg space-y-2">
                    <Input
                      placeholder="Label"
                      value={stat.label}
                      onChange={(e) => {
                        const newStats = [...content.stats];
                        newStats[i].label = e.target.value;
                        onUpdateContent("stats", newStats);
                      }}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Valor"
                      value={stat.value}
                      onChange={(e) => {
                        const newStats = [...content.stats];
                        newStats[i].value = e.target.value;
                        onUpdateContent("stats", newStats);
                      }}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="space-y-4">
              <div className="space-y-3">
                {content.features.map((feature, i) => (
                  <div key={i} className="p-3 border border-border/50 rounded-lg space-y-2">
                    <Input
                      placeholder="Título"
                      value={feature.title}
                      onChange={(e) => {
                        const newFeatures = [...content.features];
                        newFeatures[i].title = e.target.value;
                        onUpdateContent("features", newFeatures);
                      }}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Descrição"
                      value={feature.description}
                      onChange={(e) => {
                        const newFeatures = [...content.features];
                        newFeatures[i].description = e.target.value;
                        onUpdateContent("features", newFeatures);
                      }}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Badge"
                      value={feature.badge}
                      onChange={(e) => {
                        const newFeatures = [...content.features];
                        newFeatures[i].badge = e.target.value;
                        onUpdateContent("features", newFeatures);
                      }}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="space-y-4">
              <div className="space-y-3">
                {content.pricing.map((plan, i) => (
                  <div key={i} className="p-3 border border-border/50 rounded-lg space-y-2">
                    <Input
                      placeholder="Nome do Plano"
                      value={plan.name}
                      onChange={(e) => {
                        const newPricing = [...content.pricing];
                        newPricing[i].name = e.target.value;
                        onUpdateContent("pricing", newPricing);
                      }}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Preço"
                      value={plan.price}
                      onChange={(e) => {
                        const newPricing = [...content.pricing];
                        newPricing[i].price = e.target.value;
                        onUpdateContent("pricing", newPricing);
                      }}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Descrição"
                      value={plan.description}
                      onChange={(e) => {
                        const newPricing = [...content.pricing];
                        newPricing[i].description = e.target.value;
                        onUpdateContent("pricing", newPricing);
                      }}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

	            {/* Journey Tab */}
	            <TabsContent value="journey" className="space-y-4">
	              <div className="space-y-3">
	                <Label className="text-xs">Título</Label>
	                <Input
	                  value={content.journey?.title}
	                  onChange={(e) => onUpdateContent("journey", { ...content.journey, title: e.target.value })}
	                  className="text-sm"
	                />
	                <Label className="text-xs">Texto Principal</Label>
	                <Input
	                  value={content.journey?.text}
	                  onChange={(e) => onUpdateContent("journey", { ...content.journey, text: e.target.value })}
	                  className="text-sm"
	                />
	                <Label className="text-xs">Micro-história</Label>
	                <Input
	                  value={content.journey?.story}
	                  onChange={(e) => onUpdateContent("journey", { ...content.journey, story: e.target.value })}
	                  className="text-sm"
	                />
	                <Label className="text-xs">CTA</Label>
	                <Input
	                  value={content.journey?.cta}
	                  onChange={(e) => onUpdateContent("journey", { ...content.journey, cta: e.target.value })}
	                  className="text-sm"
	                />
	              </div>
	            </TabsContent>

	            {/* Testimonials Tab */}
	            <TabsContent value="testimonials" className="space-y-4">
	              <div className="space-y-4">
	                {content.testimonials.map((t, i) => (
	                  <div key={i} className="p-3 border border-border/50 rounded-lg space-y-2">
	                    <Input
	                      placeholder="Nome"
	                      value={t.name}
	                      onChange={(e) => {
	                        const newT = [...content.testimonials];
	                        newT[i].name = e.target.value;
	                        onUpdateContent("testimonials", newT);
	                      }}
	                      className="text-sm"
	                    />
	                    <Input
	                      placeholder="Escola/Instituição"
	                      value={t.school}
	                      onChange={(e) => {
	                        const newT = [...content.testimonials];
	                        newT[i].school = e.target.value;
	                        onUpdateContent("testimonials", newT);
	                      }}
	                      className="text-sm"
	                    />
	                    <Input
	                      placeholder="Depoimento"
	                      value={t.text}
	                      onChange={(e) => {
	                        const newT = [...content.testimonials];
	                        newT[i].text = e.target.value;
	                        onUpdateContent("testimonials", newT);
	                      }}
	                      className="text-sm"
	                    />
	                    <div className="flex items-center gap-2">
	                      <Input
	                        placeholder="URL da Foto"
	                        value={t.avatar}
	                        onChange={(e) => {
	                          const newT = [...content.testimonials];
	                          newT[i].avatar = e.target.value;
	                          onUpdateContent("testimonials", newT);
	                        }}
	                        className="text-sm flex-1"
	                      />
	                      <Button 
	                        size="icon" 
	                        variant="outline" 
	                        className="h-9 w-9"
	                        onClick={() => {
	                          const input = document.createElement('input');
	                          input.type = 'file';
	                          input.accept = 'image/*';
	                          input.onchange = async (e) => {
	                            const file = (e.target as HTMLInputElement).files?.[0];
	                            if (!file) return;
	                            
	                            const ext = file.name.split('.').pop();
	                            const fileName = `testimonial_${Date.now()}.${ext}`;
	                            const { data, error } = await supabase.storage
	                              .from('hero-images')
	                              .upload(fileName, file);
	                            
	                            if (error) {
	                              toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
	                              return;
	                            }
	                            
	                            const { data: urlData } = supabase.storage.from('hero-images').getPublicUrl(fileName);
	                            const newT = [...content.testimonials];
	                            newT[i].avatar = urlData.publicUrl;
	                            onUpdateContent("testimonials", newT);
	                            toast({ title: "Foto carregada!" });
	                          };
	                          input.click();
	                        }}
	                      >
	                        <ImageIcon className="h-4 w-4" />
	                      </Button>
	                    </div>
	                  </div>
	                ))}
	              </div>
	            </TabsContent>

	            {/* CTA Tab */}
	            <TabsContent value="cta" className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 border border-border/50 rounded-lg space-y-2">
                  <Label className="text-sm">Título CTA</Label>
                  <Input
                    value={content.cta.title}
                    onChange={(e) => {
                      onUpdateContent("cta", { ...content.cta, title: e.target.value });
                    }}
                    className="text-sm"
                  />
                </div>
                <div className="p-3 border border-border/50 rounded-lg space-y-2">
                  <Label className="text-sm">Subtítulo CTA</Label>
                  <Input
                    value={content.cta.subtitle}
                    onChange={(e) => {
                      onUpdateContent("cta", { ...content.cta, subtitle: e.target.value });
                    }}
                    className="text-sm"
                  />
                </div>
                <div className="p-3 border border-border/50 rounded-lg space-y-2">
                  <Label className="text-sm">Texto do Botão</Label>
                  <Input
                    value={content.cta.buttonText}
                    onChange={(e) => {
                      onUpdateContent("cta", { ...content.cta, buttonText: e.target.value });
                    }}
                    className="text-sm"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="space-y-2 sticky bottom-0 bg-background/95 backdrop-blur-sm pt-4 border-t border-border/50">
            <Button
              onClick={handleSaveContent}
              disabled={saving}
              className="w-full gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "A guardar..." : "Guardar Alterações"}
            </Button>
            <Button
              onClick={handleExportHTML}
              variant="outline"
              className="w-full gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar HTML
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdminLandingPanelFloat;
