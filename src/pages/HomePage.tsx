import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ArrowRight, 
  Sparkles, 
  Download, 
  Moon, 
  Sun, 
  ChevronRight,
  Shield,
  Zap,
  FileText,
  BookOpen,
  HelpCircle,
  ClipboardList,
  Lightbulb,
  Users,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import DelleLogo from "@/components/DelleLogo";
import { usePwaInstall } from "@/hooks/use-pwa-install";
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
  journey: { title: string; text: string; story: string; cta: string };
  cta: { title: string; subtitle: string; buttonText: string };
}

const AnimatedTitle = () => {
  const line1 = "Aprenda mais,";
  const line2 = "estude melhor";

  return (
    <h1 className="text-5xl sm:text-6xl md:text-8xl font-apple font-bold tracking-tight leading-[1.05] mb-8 text-foreground">
      <motion.span
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="block"
      >
        {line1}
      </motion.span>
      <motion.span
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="block text-primary"
      >
        {line2}
      </motion.span>
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
    <div className="absolute inset-0 overflow-hidden z-0">
      <AnimatePresence mode="wait">
        <motion.img
          key={images[current]?.id}
          src={images[current]?.url}
          alt="Hero"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.15, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
    </div>
  );
};

const FeatureIcon = ({ name, className }: { name: string; className?: string }) => {
  const icons: Record<string, any> = {
    FileText, BookOpen, HelpCircle, ClipboardList, Lightbulb, Shield, Zap, Users, Star
  };
  const Icon = icons[name] || Sparkles;
  return <Icon className={className} />;
};

const HomePage = () => {
  const navigate = useNavigate();
  const { canInstall, install } = usePwaInstall();
  const { theme, toggleTheme } = useTheme();
  const { isAdmin } = useAdmin();
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [carouselEnabled, setCarouselEnabled] = useState(false);
  const [sectionImages, setSectionImages] = useState<Record<string, string>>({});
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
      { name: "Gratuito", price: "0 Kz", description: "Perfeito para começar", features: ["2 Trabalhos Escolares", "3 Resumos de Fotos", "3 Questionários", "Suporte por email"], popular: false },
      { name: "Básico", price: "546 Kz", description: "Ideal para necessidades pontuais", features: ["3 Trabalhos Escolares", "4 Resumos de Fotos", "Questionários Ilimitados", "Suporte por email"], popular: false },
      { name: "Intermédio", price: "1.250 Kz", description: "Para estudantes dedicados", features: ["5 Trabalhos Escolares", "7 Resumos de Fotos", "7 Questionários", "5 Planos de Aula", "2 TFC/Monografias", "300 Créditos totais"], popular: false },
      { name: "Profissional", price: "3.850 Kz", description: "Recomendado para o sucesso académico", features: ["10 Trabalhos Escolares", "16 Resumos de Fotos", "16 Questionários", "10 Planos de Aula", "8 TFC/Monografias", "500 Créditos totais"], popular: true },
      { name: "Premium", price: "7.500 Kz", description: "Acesso total e ilimitado", features: ["Tudo Ilimitado", "Trabalhos Escolares", "Resumos de Fotos", "Questionários", "Planos de Aula", "TFC/Monografias", "Suporte prioritário"], popular: false }
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
    journey: {
      title: "Sua Jornada, Sem Barreiras",
      text: "Imagine poder transformar suas ideias, suas anotações, seus momentos de estudo em trabalhos brilhantes, com apenas alguns cliques. Com o Deli, o seu potencial não tem limites. Do resumo do caderno ao currículo perfeito, você vai se destacar.",
      story: "Como a Ana, que estava travada num trabalho de sociologia, tirou um A+ em menos de uma semana, ou como o professor Marcos, que agora economiza horas preparando suas aulas.",
      cta: "Dê o próximo passo na sua jornada hoje. Cadastre-se no Deli e libere o seu melhor."
    },
    cta: { title: "Pronto para transformar sua educação?", subtitle: "Junte-se a milhares de estudantes e professores que já estão usando a Delle", buttonText: "Começar Agora Grátis" }
  });
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [imgRes, settingsRes] = await Promise.all([
        supabase.from("hero_images").select("id, url, ordem").eq("ativo", true).order("ordem", { ascending: true }),
        supabase.from("site_settings").select("chave, valor"),
      ]);

      setHeroImages(imgRes.data as HeroImage[] ?? []);
      
      if (settingsRes.data) {
        const carousel = settingsRes.data.find(s => s.chave === "hero_carousel");
        if (carousel) setCarouselEnabled(carousel.valor === "true");

        const sectionImgs: Record<string, string> = {};
        settingsRes.data.forEach(s => {
          if (s.chave.startsWith("section_image_")) {
            sectionImgs[s.chave] = s.valor;
          }
        });
        setSectionImages(sectionImgs);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Header - Apple Style */}
      <header className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <DelleLogo size={28} />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#funcionalidades" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#preços" className="hover:text-foreground transition-colors">Preços</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="hidden sm:flex font-medium" onClick={() => navigate("/auth")}>
              Entrar
            </Button>
            <Button size="sm" className="apple-button-primary" onClick={() => navigate("/auth")}>
              Começar grátis
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden min-h-[90vh] flex flex-col items-center justify-center text-center px-6">
        <div className="absolute inset-0 z-0 opacity-40">
          <FloatingPaths position={1} />
        </div>
        
        {heroImages.length > 0 && (
          <HeroCarousel images={heroImages} />
        )}

        <div className="relative z-10 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-primary text-xs font-semibold mb-10 border border-border/40"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Plataforma educacional angolana com IA
          </motion.div>

          <AnimatedTitle />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Gere trabalhos escolares, resumos, questionários e planos de aula adaptados às normas de Angola com perfeição.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="lg" className="apple-button-primary h-14 px-10 text-lg" onClick={() => navigate("/auth")}>
              Começar agora <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="apple-button h-14 px-10 text-lg border-2" onClick={() => document.getElementById('funcionalidades')?.scrollIntoView({ behavior: 'smooth' })}>
              Ver funcionalidades
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid - Apple Style */}
      <section id="funcionalidades" className="apple-section-container">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Tudo o que precisas.</h2>
          <p className="text-xl text-muted-foreground">Ferramentas poderosas desenhadas para o teu sucesso.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {content.features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="group p-8 rounded-[2.5rem] bg-secondary/50 border border-border/40 hover:bg-secondary transition-all duration-500"
            >
              <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-500">
                <FeatureIcon name={feature.icon} className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Journey Section - Premium Apple Look */}
      <section className="py-32 bg-secondary/30">
        <div className="apple-section-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-8 leading-[1.1]">
                {content.journey?.title}
              </h2>
              <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
                {content.journey?.text}
              </p>
              <div className="p-8 rounded-[2rem] bg-background border border-border/40 shadow-apple-premium mb-10">
                <p className="text-lg italic text-foreground/80">"{content.journey?.story}"</p>
              </div>
              <Button size="lg" className="apple-button-primary h-14 px-10 text-lg" onClick={() => navigate("/auth")}>
                Criar minha conta <ChevronRight className="ml-1 h-5 w-5" />
              </Button>
            </motion.div>
            
            {sectionImages.section_image_journey && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl border border-border/40"
              >
                <img 
                  src={sectionImages.section_image_journey} 
                  alt="Jornada" 
                  className="w-full h-full object-contain" 
                />
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Pricing - Minimalist Apple Cards */}
      <section id="preços" className="apple-section-container">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Escolha o seu plano.</h2>
          <p className="text-xl text-muted-foreground">Transparente e flexível para todos os estudantes.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {content.pricing.filter(p => ["Gratuito", "Intermédio", "Premium"].includes(p.name)).map((plan, i) => (
            <div 
              key={i} 
              className={`p-10 rounded-[2.5rem] border transition-all duration-500 flex flex-col ${plan.popular ? 'border-primary bg-primary/[0.02] shadow-apple-premium scale-105 z-10' : 'border-border/40 bg-secondary/50'}`}
            >
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-muted-foreground mb-6">{plan.description}</p>
              <div className="text-4xl font-bold mb-8">{plan.price}</div>
              <ul className="space-y-4 mb-10 flex-grow">
                {plan.features.map((feat, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <ChevronRight className="h-3 w-3 text-primary" />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>
              <Button className={plan.popular ? 'apple-button-primary h-12' : 'apple-button-secondary h-12'} onClick={() => navigate("/auth")}>
                Selecionar Plano
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="apple-section-container">
        <div className="relative p-12 md:p-24 rounded-[3.5rem] bg-foreground text-background overflow-hidden text-center">
          <div className="absolute inset-0 opacity-10">
            <FloatingPaths position={-1} />
          </div>
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8">
              {content.cta.title}
            </h2>
            <p className="text-xl opacity-70 mb-12 max-w-2xl mx-auto">
              {content.cta.subtitle}
            </p>
            <Button size="lg" className="bg-background text-foreground hover:bg-background/90 rounded-full h-16 px-12 text-xl font-bold" onClick={() => navigate("/auth")}>
              {content.cta.buttonText}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-border/40">
        <div className="apple-section-container flex flex-col md:flex-row justify-between items-center gap-10">
          <DelleLogo size={24} />
          <p className="text-sm text-muted-foreground">© 2026 Delle. Todos os direitos reservados. Orgulhosamente angolano.</p>
          <div className="flex gap-8 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Termos</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
          </div>
        </div>
      </footer>

      {isAdmin && (
        <>
          <AdminLandingPanelFloat content={content} onUpdateContent={updateContent} onClose={() => setAdminOpen(false)} />
        </>
      )}
    </div>
  );
};

export default HomePage;
