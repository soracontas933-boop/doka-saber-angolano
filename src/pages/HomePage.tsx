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
  ChevronDown,
  Play
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
  journey: { title: string; text: string; story: string; cta: string };
  cta: { title: string; subtitle: string; buttonText: string };
}

const AnimatedTitle = () => {
  const line1 = "Aprenda mais,";
  const line2 = "estude melhor";

  return (
    <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tight leading-[1.05] mb-8 text-foreground">
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
            className="inline-block bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] bg-clip-text text-transparent">
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
      <div className="absolute inset-0 bg-black/40 dark:bg-black/70 z-[10]" />
      {images.length > 1 &&
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2 z-[20]">
          {images.map((_, i) =>
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-white scale-125" : "bg-white/40"}`} />
          )}
        </div>
      }
    </div>
  );
};

const HeroSingle = ({ image }: { image: HeroImage }) =>
  <div className="absolute inset-0 overflow-hidden z-[5]">
    <img src={image.url} alt="Hero" className="absolute inset-0 w-full h-full object-cover" loading="eager" decoding="async" fetchPriority="high" />
    <div className="absolute inset-0 bg-black/40 dark:bg-black/70 z-[10]" />
  </div>;

const VideoEmbed = ({ url }: { url: string }) => {
  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('watch?v=', 'embed/');
    }
    if (url.includes('youtu.be/')) {
      return url.replace('youtu.be/', 'youtube.com/embed/');
    }
    return url;
  };

  const isLocalVideo = url.includes('supabase.co') || url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg');

  return (
    <div className="relative aspect-video rounded-[2rem] overflow-hidden border border-border/50 shadow-2xl bg-black group">
      {isLocalVideo ? (
        <video 
          src={url} 
          controls 
          className="w-full h-full object-cover"
          playsInline
        />
      ) : (
        <iframe
          src={getEmbedUrl(url)}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const { canInstall, install } = usePwaInstall();
  const { theme, toggleTheme } = useTheme();
  const { isAdmin } = useAdmin();
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [carouselEnabled, setCarouselEnabled] = useState(false);
  const [sectionImages, setSectionImages] = useState<Record<string, string>>({});
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
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
        supabase.from("hero_images").select("*").eq("ativo", true).order("ordem", { ascending: true }),
        supabase.from("site_settings").select("*")
      ]);

      setHeroImages(imgRes.data as HeroImage[] ?? []);
      
      if (settingsRes.data) {
        const settings: Record<string, string> = {};
        settingsRes.data.forEach(s => {
          settings[s.chave] = s.valor;
        });
        setSiteSettings(settings);
        
        if (settings.hero_carousel) setCarouselEnabled(settings.hero_carousel === "true");

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

  const hasHeroImages = heroImages.length > 0;

  const updateContent = (section: keyof LandingContent, data: any) => {
    setContent(prev => ({ ...prev, [section]: data }));
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden font-apple">
      {/* Nav */}
      <header className="relative z-[30] flex items-center justify-between px-6 md:px-12 py-4 border-b border-border/40 bg-background/70 backdrop-blur-xl sticky top-0">
        <DelleLogo size={28} />
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-foreground h-9 w-9 rounded-full">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {canInstall &&
            <Button variant="outline" size="sm" className="rounded-full hidden sm:inline-flex border-border/60" onClick={install}>
              <Download className="h-4 w-4 mr-2" /> Baixar App
            </Button>
          }
          <Button variant="ghost" size="sm" className="rounded-full px-5" onClick={() => navigate("/auth")}>Entrar</Button>
          <Button size="sm" className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full px-6 shadow-sm" onClick={() => navigate("/auth")}>Começar grátis</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 md:px-12 pt-20 pb-32 max-w-7xl mx-auto text-center min-h-[90vh] flex flex-col justify-center items-center">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>

        {hasHeroImages && (
          carouselEnabled && heroImages.length > 1 ?
            <HeroCarousel images={heroImages} /> :
            <HeroSingle image={heroImages[0]} />)
        }

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-[20] max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] text-xs font-semibold mb-10 border border-[#3B82F6]/20 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            Plataforma educacional angolana com IA
          </div>

          <AnimatedTitle />

          <p className="text-lg md:text-2xl max-w-2xl mx-auto mb-12 leading-relaxed text-muted-foreground/80 font-medium">
            Gere trabalhos escolares, resumos de conteúdo, questionários e planos de aula adaptados às normas de Angola.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Button size="lg" className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full px-10 h-14 text-lg shadow-lg shadow-blue-500/20 transition-all hover:scale-105" onClick={() => navigate("/auth")}>
              Começar agora <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button variant="outline" size="lg" className="rounded-full px-10 h-14 text-lg border-border/60 hover:bg-secondary transition-all hover:scale-105" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
              Ver funcionalidades
            </Button>
          </div>

          {/* Hero Stats - Small text at bottom */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-border/20 w-full">
            {content.stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Journey Section (3rd Section with Video Support) */}
      <section className="relative w-full py-32 px-6 md:px-12 overflow-hidden bg-white dark:bg-[#0B0B0B]">
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className={`grid grid-cols-1 ${ (sectionImages.section_image_journey || siteSettings.section_video_journey) ? 'lg:grid-cols-2' : ''} gap-20 items-center`}>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] text-xs font-bold mb-8 border border-[#3B82F6]/20">
                <Sparkles className="h-3 w-3" />
                Sua Evolução
              </div>
              <h2 className="text-5xl md:text-7xl font-bold mb-10 text-foreground tracking-tight leading-[1.1]">
                {content.journey?.title || "Sua Jornada, Sem Barreiras"}
              </h2>
              <div className="space-y-8 text-xl text-muted-foreground leading-relaxed mb-12">
                <p className="relative pl-8 border-l-2 border-[#3B82F6]/30">
                  {content.journey?.text}
                </p>
                <div className="relative p-10 rounded-[2rem] bg-[#F5F5F7] dark:bg-[#1D1D1F] border border-border/40 shadow-sm overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Users className="h-16 w-16 text-[#3B82F6]" />
                  </div>
                  <p className="relative z-10 italic text-foreground/90 text-2xl leading-relaxed font-medium">
                    "{content.journey?.story}"
                  </p>
                  <div className="mt-6 flex items-center gap-3 text-[#3B82F6] font-bold">
                    <div className="h-px w-10 bg-[#3B82F6]/30" />
                    <span className="text-xs uppercase tracking-widest">História de Sucesso</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
                <Button size="lg" className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full px-12 h-16 text-xl shadow-xl shadow-blue-500/20 transition-all hover:scale-105" onClick={() => navigate("/auth")}>
                  {content.journey?.cta || "Começar Agora"} <ArrowRight className="h-6 w-6 ml-2" />
                </Button>
                <div className="flex -space-x-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-12 h-12 rounded-full border-4 border-background bg-muted flex items-center justify-center text-xs font-bold overflow-hidden shadow-sm">
                      <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <div className="w-12 h-12 rounded-full border-4 border-background bg-[#3B82F6] text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                    +50k
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              className="relative"
            >
              {siteSettings.section_video_journey ? (
                <VideoEmbed url={siteSettings.section_video_journey} />
              ) : sectionImages.section_image_journey ? (
                <div className="relative aspect-[4/5] lg:aspect-square rounded-[2.5rem] overflow-hidden border border-border/40 shadow-2xl group">
                  <img 
                    src={sectionImages.section_image_journey} 
                    alt="Jornada" 
                    className="w-full h-full object-contain bg-[#F5F5F7] dark:bg-[#1D1D1F] transition-transform duration-1000 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-40" />
                </div>
              ) : null}
              
              {/* Decorative elements */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#3B82F6]/10 rounded-full blur-3xl -z-10" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#60A5FA]/10 rounded-full blur-3xl -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative w-full py-32 px-6 md:px-12 bg-[#F5F5F7] dark:bg-[#0B0B0B]/50">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground tracking-tight">Funcionalidades Poderosas</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Tudo que você precisa para dominar seus estudos, em um único lugar</p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {content.features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="p-10 rounded-[2rem] bg-white dark:bg-[#1D1D1F] border border-border/40 hover:border-[#3B82F6]/30 hover:shadow-xl transition-all duration-500 group"
              >
                <div className="p-4 rounded-2xl bg-[#3B82F6]/10 w-fit mb-8 group-hover:bg-[#3B82F6]/20 transition-colors">
                  {feature.icon === "FileText" && <FileText className="h-8 w-8 text-[#3B82F6]" />}
                  {feature.icon === "BookOpen" && <BookOpen className="h-8 w-8 text-[#3B82F6]" />}
                  {feature.icon === "HelpCircle" && <HelpCircle className="h-8 w-8 text-[#3B82F6]" />}
                  {feature.icon === "ClipboardList" && <ClipboardList className="h-8 w-8 text-[#3B82F6]" />}
                  {feature.icon === "Lightbulb" && <Lightbulb className="h-8 w-8 text-[#3B82F6]" />}
                  {feature.icon === "Shield" && <Shield className="h-8 w-8 text-[#3B82F6]" />}
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-2xl font-bold text-foreground">{feature.title}</h3>
                  <Badge variant="secondary" className="bg-[#3B82F6]/10 text-[#3B82F6] border-none text-[10px] uppercase tracking-widest font-bold">{feature.badge}</Badge>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative w-full py-32 px-6 md:px-12 bg-white dark:bg-[#0B0B0B]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground tracking-tight">Planos Simples</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Escolha o plano ideal para o seu sucesso académico</p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.pricing.filter(p => p.name !== "Gratuito" && p.name !== "Básico").map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`relative p-10 rounded-[2.5rem] border transition-all duration-500 flex flex-col
                ${plan.popular 
                    ? "border-[#3B82F6] bg-[#3B82F6]/5 shadow-2xl scale-105 z-10" 
                    : "border-border/40 bg-[#F5F5F7] dark:bg-[#1D1D1F] hover:border-[#3B82F6]/30"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#3B82F6] text-white text-[10px] font-bold uppercase tracking-[0.2em] px-6 py-2 rounded-full shadow-lg">
                    Mais Popular
                  </div>
                )}
                <h3 className="text-3xl font-bold mb-2 text-foreground">{plan.name}</h3>
                <p className="text-muted-foreground mb-8 font-medium">{plan.description}</p>
                <div className="mb-10">
                  <span className="text-5xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground ml-2">/mês</span>
                </div>
                <ul className="space-y-5 mb-12 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-foreground/80 font-medium">
                      <div className="mt-1 p-0.5 rounded-full bg-[#3B82F6]/20">
                        <Check className="h-4 w-4 text-[#3B82F6]" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className={`w-full h-14 rounded-full text-lg font-bold transition-all hover:scale-105 ${plan.popular ? 'bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-black border-border/60 hover:bg-secondary'}`} variant={plan.popular ? "default" : "outline"}>
                  Começar Agora
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final Section */}
      <section className="relative w-full py-32 px-6 md:px-12 overflow-hidden">
        <div className="max-w-[1000px] mx-auto relative z-10 bg-[#3B82F6] rounded-[3rem] p-16 md:p-24 text-center text-white shadow-2xl shadow-blue-500/30 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight">{content.cta.title}</h2>
            <p className="text-xl md:text-2xl mb-12 text-white/80 max-w-2xl mx-auto font-medium">{content.cta.subtitle}</p>
            <Button size="lg" className="bg-white text-[#3B82F6] hover:bg-white/90 rounded-full px-12 h-16 text-xl font-bold shadow-xl transition-all hover:scale-105" onClick={() => navigate("/auth")}>
              {content.cta.buttonText} <ArrowRight className="h-6 w-6 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative w-full py-24 px-6 md:px-12 border-t border-border/40 bg-[#F5F5F7] dark:bg-[#0B0B0B]">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-12 mb-20">
            <div className="md:col-span-2">
              <DelleLogo size={32} />
              <p className="mt-6 text-lg text-muted-foreground max-w-xs leading-relaxed">
                A primeira plataforma educacional de Angola potenciada por Inteligência Artificial.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-6 uppercase tracking-widest text-xs">Produto</h4>
              <ul className="space-y-4 text-muted-foreground font-medium">
                <li><a href="#" className="hover:text-[#3B82F6] transition-colors">Funcionalidades</a></li>
                <li><a href="#" className="hover:text-[#3B82F6] transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-[#3B82F6] transition-colors">Segurança</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-6 uppercase tracking-widest text-xs">Empresa</h4>
              <ul className="space-y-4 text-muted-foreground font-medium">
                <li><a href="#" className="hover:text-[#3B82F6] transition-colors">Sobre Nós</a></li>
                <li><a href="#" className="hover:text-[#3B82F6] transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-[#3B82F6] transition-colors">Contacto</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-6 uppercase tracking-widest text-xs">Legal</h4>
              <ul className="space-y-4 text-muted-foreground font-medium">
                <li><a href="#" className="hover:text-[#3B82F6] transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-[#3B82F6] transition-colors">Termos</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/20 pt-12 flex flex-col md:flex-row justify-between items-center gap-6 text-muted-foreground font-medium">
            <p>&copy; 2026 Delle. Todos os direitos reservados.</p>
            <p>Feito com ❤️ em Angola.</p>
          </div>
        </div>
      </footer>

      {/* Admin Floating Button */}
      {isAdmin && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-8 right-8 z-[40] p-4 rounded-full bg-[#3B82F6] text-white shadow-2xl hover:shadow-blue-500/40 hover:scale-110 transition-all"
          onClick={() => setAdminOpen(!adminOpen)}
        >
          <Settings className="h-7 w-7" />
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
