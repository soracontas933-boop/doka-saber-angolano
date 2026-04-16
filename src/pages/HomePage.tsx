import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  BookOpen, 
  HelpCircle, 
  ClipboardList, 
  ArrowRight, 
  Sparkles, 
  Zap, 
  Shield, 
  Download, 
  Check, 
  Crown, 
  Moon, 
  Sun, 
  Lightbulb, 
  GraduationCap, 
  Users, 
  Star, 
  ChevronRight,
  Settings,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import DelleLogo from "@/components/DelleLogo";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { PLAN_CONFIGS, type PlanKey } from "@/hooks/use-user-plan";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FloatingPaths } from "@/components/ui/background-paths";
import AdminLandingPanelFloat from "@/components/AdminLandingPanelFloat";
import { useAdmin } from "@/hooks/use-admin";

interface HeroImage {
  id: string;
  url: string;
  ordem: number;
}

interface LandingContent {
  stats: Array<{ label: string; value: string; icon: string }>;
  features: Array<{ icon: string; title: string; description: string; badge: string }>;
  steps: Array<{ number: number; title: string; description: string; icon: string }>;
  testimonials: Array<{ name: string; school: string; text: string; avatar: string }>;
  pricing: Array<{ name: string; price: string; description: string; features: string[]; popular: boolean }>;
  partners: Array<{ name: string; logo: string }>;
  faq: Array<{ question: string; answer: string }>;
  cta: { title: string; subtitle: string; buttonText: string };
}

const AnimatedTitle = () => {
  const line1 = "Aprenda mais,";
  const line2 = "estude melhor";

  return (
    <h1 className="text-4xl sm:text-5xl md:text-7xl font-apple font-bold tracking-tight leading-[1.05] mb-6 sm:mb-8 text-foreground">
      <span className="block">
        {line1.split("").map((letter, i) =>
          <motion.span
            key={`l1-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.03, duration: 0.3 }}
            className="inline-block text-foreground">
            {letter === " " ? "\u00A0" : letter}
          </motion.span>
        )}
      </span>
      <span className="block">
        {line2.split("").map((letter, i) =>
          <motion.span
            key={`l2-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + (line1.length + i) * 0.03, duration: 0.3 }}
            className="inline-block bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            {letter === " " ? "\u00A0" : letter}
          </motion.span>
        )}
      </span>
    </h1>
  );
};

const HeroCarousel = ({ images }: { images: HeroImage[] }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => setCurrent((p) => (p + 1) % images.length), 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="absolute inset-0 overflow-hidden z-[5]">
      <AnimatePresence mode="wait">
        <motion.img
          key={images[current]?.id}
          src={images[current]?.url}
          alt="Hero"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          decoding="async"
          fetchPriority="high" />
      </AnimatePresence>
      <div className="absolute inset-0 bg-black/70 z-[10]" />
      {images.length > 1 &&
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-[20]">
          {images.map((_, i) =>
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? "bg-primary scale-125" : "bg-white/40"}`} />
          )}
        </div>
      }
    </div>
  );
};

const HeroSingle = ({ image }: { image: HeroImage }) =>
  <div className="absolute inset-0 overflow-hidden z-[5]">
    <img src={image.url} alt="Hero" className="absolute inset-0 w-full h-full object-cover" loading="eager" decoding="async" fetchPriority="high" />
    <div className="absolute inset-0 bg-black/70 z-[10]" />
  </div>;

const HomePage = () => {
  const navigate = useNavigate();
  const { canInstall, install } = usePwaInstall();
  const { theme, toggleTheme } = useTheme();
  const { isAdmin } = useAdmin();
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [carouselEnabled, setCarouselEnabled] = useState(false);
  const [content, setContent] = useState<LandingContent>({
    stats: [
      { label: "Alunos Activos", value: "50K+", icon: "Users" },
      { label: "Taxa de Satisfação", value: "98%", icon: "Star" },
      { label: "Documentos Gerados", value: "500K+", icon: "FileText" },
      { label: "Tipos de Ferramentas", value: "6+", icon: "Zap" }
    ],
    features: [
      { icon: "FileText", title: "Trabalhos Escolares", description: "Gere trabalhos completos com capa, índice e conclusão no formato angolano", badge: "Mais Popular" },
      { icon: "BookOpen", title: "Resumos Inteligentes", description: "Transforme fotos em resumos estruturados e flashcards de estudo", badge: "IA Avançada" },
      { icon: "HelpCircle", title: "Questionários", description: "Crie questionários interativos com correção automática", badge: "Interactivo" },
      { icon: "ClipboardList", title: "Planos de Aula", description: "Planos no formato INIDE, prontos para usar na sala de aula", badge: "Profissional" },
      { icon: "Lightbulb", title: "Ideias Criativas", description: "Sugestões personalizadas para enriquecer seus projectos", badge: "Inovador" },
      { icon: "Shield", title: "Segurança Total", description: "Seus dados estão protegidos com criptografia de nível militar", badge: "Seguro" }
    ],
    steps: [
      { number: 1, title: "Registe-se Gratuitamente", description: "Crie sua conta em menos de 1 minuto, sem cartão de crédito", icon: "User" },
      { number: 2, title: "Escolha a Ferramenta", description: "Selecione entre trabalhos, resumos, questionários ou planos", icon: "Zap" },
      { number: 3, title: "Deixe a IA Trabalhar", description: "Forneça o tema e a IA gera conteúdo de qualidade em segundos", icon: "Sparkles" },
      { number: 4, title: "Customize e Exporte", description: "Ajuste os detalhes e exporte em PDF ou Word", icon: "Download" }
    ],
    testimonials: [
      { name: "Joana Silva", school: "Escola Secundária 21 de Janeiro", text: "A Delle transformou minha forma de estudar. Agora consigo fazer resumos muito mais rápido e com melhor qualidade.", avatar: "👩‍🎓" },
      { name: "Carlos Mendes", school: "Instituto Técnico de Luanda", text: "Como professor, economizo horas criando planos de aula. A qualidade é excelente e os alunos adoram.", avatar: "👨‍🏫" },
      { name: "Maria Santos", school: "Universidade Agostinho Neto", text: "Finalmente uma ferramenta feita para Angola! Respeita as normas do INIDE e funciona perfeitamente.", avatar: "👩‍🎓" }
    ],
    pricing: [
      { name: "Grátis", price: "0 Kz", description: "Perfeito para começar", features: ["5 documentos/mês", "Resumos básicos", "Suporte por email"], popular: false },
      { name: "Estudante", price: "2.990 Kz", description: "Recomendado para estudantes", features: ["Documentos ilimitados", "Resumos avançados", "Questionários", "Suporte prioritário"], popular: true },
      { name: "Profissional", price: "9.990 Kz", description: "Para professores e profissionais", features: ["Tudo do Estudante", "Planos de Aula", "Análise de desempenho", "Suporte 24/7"] , popular: false }
    ],
    partners: [
      { name: "Universidade Agostinho Neto", logo: "🏫" },
      { name: "Instituto Técnico de Luanda", logo: "🏛️" },
      { name: "Ministério da Educação", logo: "📚" },
      { name: "Associação de Professores", logo: "👥" }
    ],
    faq: [
      { question: "Como funciona a IA da Delle?", answer: "A Delle utiliza modelos de IA avançados treinados especificamente para o contexto educacional angolano, respeitando as normas do INIDE." },
      { question: "Meus dados estão seguros?", answer: "Sim! Utilizamos criptografia de nível militar e conformidade com LGPD. Seus dados nunca são compartilhados com terceiros." },
      { question: "Posso cancelar minha subscrição a qualquer momento?", answer: "Claro! Sem compromissos. Cancele quando quiser, sem penalidades ou taxas ocultas." },
      { question: "Qual é o limite de documentos?", answer: "No plano Grátis são 5 documentos por mês. Nos planos pagos, documentos ilimitados." },
      { question: "Existe suporte em português?", answer: "Sim! Temos suporte completo em português angolano, incluindo chat, email e telefone." }
    ],
    cta: { title: "Pronto para transformar sua educação?", subtitle: "Junte-se a milhares de estudantes e professores que já estão usando a Delle", buttonText: "Começar Agora Grátis" }
  });
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [imgRes, settingsRes] = await Promise.all([
        supabase.from("hero_images").select("id, url, ordem").eq("ativo", true).order("ordem", { ascending: true }),
        supabase.from("site_settings").select("valor").eq("chave", "hero_carousel").single(),
      ]);

      setHeroImages(imgRes.data as HeroImage[] ?? []);
      if (settingsRes.data) setCarouselEnabled((settingsRes.data as any).valor === "true");
    };
    load();
  }, []);

  const hasHeroImages = heroImages.length > 0;

  const updateContent = (section: keyof LandingContent, data: any) => {
    setContent(prev => ({ ...prev, [section]: data }));
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Nav */}
      <header className="relative z-[30] flex items-center justify-between px-4 sm:px-6 md:px-12 py-3 sm:py-5 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0">
        <DelleLogo size={30} />
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-foreground h-8 w-8 sm:h-10 sm:w-10">
            {theme === "dark" ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>
          {canInstall &&
            <Button variant="outline" size="sm" className="gap-1.5 hidden sm:inline-flex" onClick={install}>
              <Download className="h-4 w-4" /> Baixar App
            </Button>
          }
          <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-3" onClick={() => navigate("/auth")}>Entrar</Button>
          <Button size="sm" className="text-xs sm:text-sm px-2 sm:px-3" onClick={() => navigate("/auth")}>Começar grátis</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 md:px-12 pt-10 sm:pt-16 pb-14 sm:pb-20 max-w-7xl mx-auto text-center min-h-[80vh] flex flex-col justify-center">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>

        {hasHeroImages && (
          carouselEnabled && heroImages.length > 1 ?
            <HeroCarousel images={heroImages} /> :
            <HeroSingle image={heroImages[0]} />)
        }

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-[20]">

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-primary text-xs font-semibold mb-8 border border-border/40 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            Plataforma educacional angolana com IA
          </div>

          <AnimatedTitle />

          <p className="sm:text-lg md:text-xl max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed px-2 text-sm text-[#a7abb4]">
            Gere trabalhos escolares, resumos de conteúdo, questionários e planos de aula adaptados às normas de Angola.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="gap-2 px-8 h-12 bg-primary hover:bg-primary/90 rounded-full" onClick={() => navigate("/auth")}>
              Começar agora <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="px-8 h-12 rounded-full" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
              Ver funcionalidades
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="relative w-full py-16 sm:py-24 px-4 sm:px-6 md:px-12 bg-muted/30 border-t border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {content.stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm sm:text-base text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative w-full py-16 sm:py-24 px-4 sm:px-6 md:px-12 border-t border-border/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground">Funcionalidades Poderosas</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Tudo que você precisa para dominar seus estudos, em um único lugar</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    {feature.icon === "FileText" && <FileText className="h-6 w-6 text-primary" />}
                    {feature.icon === "BookOpen" && <BookOpen className="h-6 w-6 text-primary" />}
                    {feature.icon === "HelpCircle" && <HelpCircle className="h-6 w-6 text-primary" />}
                    {feature.icon === "ClipboardList" && <ClipboardList className="h-6 w-6 text-primary" />}
                    {feature.icon === "Lightbulb" && <Lightbulb className="h-6 w-6 text-primary" />}
                    {feature.icon === "Shield" && <Shield className="h-6 w-6 text-primary" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">{feature.title}</h3>
                      <Badge variant="secondary" className="text-xs">{feature.badge}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative w-full py-16 sm:py-24 px-4 sm:px-6 md:px-12 bg-muted/30 border-t border-border/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground">Como Funciona</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">4 passos simples para começar</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {content.steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="p-6 rounded-2xl bg-card border border-border/50 h-full">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {step.number}
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {i < content.steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                    <ChevronRight className="h-6 w-6 text-border" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative w-full py-16 sm:py-24 px-4 sm:px-6 md:px-12 border-t border-border/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground">O Que Dizem Sobre Nós</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Histórias reais de estudantes e professores que transformaram seus resultados</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl">{testimonial.avatar}</div>
                  <div>
                    <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                    <p className="text-xs text-muted-foreground">{testimonial.school}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground italic">"{testimonial.text}"</p>
                <div className="flex gap-1 mt-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-primary text-primary" />)}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative w-full py-16 sm:py-24 px-4 sm:px-6 md:px-12 bg-muted/30 border-t border-border/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground">Planos Simples e Transparentes</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Escolha o plano perfeito para suas necessidades</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.pricing.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`relative p-8 rounded-2xl border transition-all ${
                  plan.popular
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 md:scale-105"
                    : "border-border/50 bg-card hover:border-primary/30"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary">Mais Popular</Badge>
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2 text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-primary">{plan.price}</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <Button className="w-full mb-6" variant={plan.popular ? "default" : "outline"}>
                  Começar Agora
                </Button>
                <ul className="space-y-3">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="relative w-full py-16 sm:py-24 px-4 sm:px-6 md:px-12 border-t border-border/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground">Parceiros de Confiança</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Instituições educacionais que confiam em nós</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {content.partners.map((partner, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-all flex items-center justify-center h-24"
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{partner.logo}</div>
                  <p className="text-xs text-muted-foreground text-center line-clamp-2">{partner.name}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative w-full py-16 sm:py-24 px-4 sm:px-6 md:px-12 bg-muted/30 border-t border-border/50">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground">Perguntas Frequentes</h2>
            <p className="text-lg text-muted-foreground">Respostas para as dúvidas mais comuns</p>
          </motion.div>

          <div className="space-y-4">
            {content.faq.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground pr-4">{item.question}</h3>
                  <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
                <p className="text-sm text-muted-foreground mt-3 hidden group-hover:block">{item.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final Section */}
      <section className="relative w-full py-16 sm:py-24 px-4 sm:px-6 md:px-12 border-t border-border/50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground">{content.cta.title}</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">{content.cta.subtitle}</p>
            <Button size="lg" className="gap-2 px-8 h-12 rounded-full" onClick={() => navigate("/auth")}>
              {content.cta.buttonText} <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative w-full py-12 sm:py-16 px-4 sm:px-6 md:px-12 border-t border-border/50 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-foreground mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Funcionalidades</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Segurança</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Sobre Nós</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contacte-nos</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Termos</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Cookies</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Redes Sociais</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">LinkedIn</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Instagram</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 Delle. Todos os direitos reservados. Feito com ❤️ em Angola.</p>
          </div>
        </div>
      </footer>

      {/* Admin Floating Button */}
      {isAdmin && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-6 right-6 z-[40] p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all"
          onClick={() => setAdminOpen(!adminOpen)}
        >
          <Settings className="h-6 w-6" />
        </motion.button>
      )}

      {/* Admin Panel */}
      {isAdmin && adminOpen && (
        <AdminLandingPanelFloat
          content={content}
          onUpdateContent={updateContent}
          onClose={() => setAdminOpen(false)}
        />
      )}
    </div>
  );
};

export default HomePage;
