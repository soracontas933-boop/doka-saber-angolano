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
  ChevronRight 
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

/* ── hero image types ── */
interface HeroImage {
  id: string;
  url: string;
  ordem: number;
}

/* ── animated title ── */
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

/* ── Hero carousel / single ── */
const HeroCarousel = ({ images }: { images: HeroImage[]; }) => {
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

const HeroSingle = ({ image }: { image: HeroImage; }) =>
  <div className="absolute inset-0 overflow-hidden z-[5]">
    <img src={image.url} alt="Hero" className="absolute inset-0 w-full h-full object-cover" loading="eager" decoding="async" fetchPriority="high" />
    <div className="absolute inset-0 bg-black/70 z-[10] mb-[10px]" />
  </div>;

/* ── page ── */
const HomePage = () => {
  const navigate = useNavigate();
  const { canInstall, install } = usePwaInstall();
  const { theme, toggleTheme } = useTheme();
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [carouselEnabled, setCarouselEnabled] = useState(false);
  const [sections, setSections] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [imgRes, settingsRes, sectionsRes] = await Promise.all([
        supabase.from("hero_images").select("id, url, ordem").eq("ativo", true).order("ordem", { ascending: true }),
        supabase.from("site_settings").select("valor").eq("chave", "hero_carousel").single(),
        supabase.from("landing_sections").select("*").eq("ativo", true).order("ordem", { ascending: true })
      ]);

      setHeroImages(imgRes.data as HeroImage[] ?? []);
      if (settingsRes.data) setCarouselEnabled((settingsRes.data as any).valor === "true");
      setSections(sectionsRes.data || []);
    };
    load();
  }, []);

  const renderIcon = (iconName: string) => {
    const icons: any = { FileText, BookOpen, HelpCircle, ClipboardList, Lightbulb, GraduationCap, Users, Star, Zap, Shield, Sparkles, ChevronRight, ArrowRight };
    const IconComp = icons[iconName] || HelpCircle;
    return <IconComp className="h-6 w-6 text-primary" />;
  };

  const hasHeroImages = heroImages.length > 0;

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <header className="relative z-[30] flex items-center justify-between px-4 sm:px-6 md:px-12 py-3 sm:py-5 border-b border-border/50">
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

      {/* Hero */}
      <section className="relative px-4 sm:px-6 md:px-12 pt-10 sm:pt-16 pb-14 sm:pb-20 max-w-5xl mx-auto text-center">
        <div className="absolute inset-0 z-0">
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
            Gere trabalhos escolares, resumos de conteúdo, questionários e planos de aula
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="gap-2 px-6 bg-primary hover:bg-primary/90" onClick={() => navigate("/auth")}>
              Começar agora <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="px-6" onClick={() => document.getElementById("funcionalidades")?.scrollIntoView({ behavior: "smooth" })}>
              Ver funcionalidades
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="relative z-[20] grid grid-cols-3 gap-4 mt-16 max-w-lg mx-auto">
          {[
            { icon: Sparkles, label: "Conteúdo com IA", value: "Inteligente" },
            { icon: Zap, label: "Geração rápida", value: "Instantâneo" },
            { icon: Shield, label: "Formato angolano", value: "Certificado" }
          ].map((s) =>
            <div key={s.label} className="text-center">
              <s.icon className="h-5 w-5 text-primary mx-auto mb-1.5" />
              <p className="text-sm font-semibold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          )}
        </motion.div>
      </section>

      {/* Dynamic Sections */}
      {sections.map((section, sIdx) => {
        const style = section.conteudo.style || {};
        const animation = style.animation || "fade-up";

        const getAnimationProps = (index: number) => {
          if (animation === "fade-up") return { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, transition: { delay: index * 0.1 } };
          if (animation === "fade-in") return { initial: { opacity: 0 }, whileInView: { opacity: 1 }, transition: { delay: index * 0.1 } };
          if (animation === "slide-left") return { initial: { opacity: 0, x: -40 }, whileInView: { opacity: 1, x: 0 }, transition: { delay: index * 0.1 } };
          if (animation === "slide-right") return { initial: { opacity: 0, x: 40 }, whileInView: { opacity: 1, x: 0 }, transition: { delay: index * 0.1 } };
          if (animation === "zoom-in") return { initial: { opacity: 0, scale: 0.9 }, whileInView: { opacity: 1, scale: 1 }, transition: { delay: index * 0.1 } };
          return { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 } };
        };

        const bgClass = style.bg === "card" ? "bg-card" : style.bg === "primary" ? "bg-primary/5" : style.bg === "muted" ? "bg-muted/30" : "bg-background";
        const textAlignClass = style.textAlign === "center" ? "text-center" : style.textAlign === "right" ? "text-right" : "text-left";

        if (section.tipo === 'sobre') {
          return (
            <section key={section.id} className={`px-4 sm:px-6 md:px-12 py-14 sm:py-20 border-t border-border overflow-hidden ${bgClass}`}>
              <div className="max-w-6xl mx-auto space-y-16">
                {section.conteudo.rows?.map((row: any, rIdx: number) => (
                  <div key={rIdx} className={`grid grid-cols-1 md:grid-cols-2 gap-10 items-center ${row.reverse ? 'md:flex-row-reverse' : ''}`}>
                    <motion.div
                      {...getAnimationProps(0)}
                      viewport={{ once: true }}
                      className={`space-y-5 ${row.reverse ? 'md:order-2' : 'md:order-1'} ${textAlignClass}`}
                    >
                      {row.badge && <Badge variant="outline" className="text-primary border-primary/30">{row.badge}</Badge>}
                      <h2 className="text-2xl md:text-4xl font-display font-bold text-foreground leading-tight">
                        {row.title}
                      </h2>
                      <p className="text-muted-foreground leading-relaxed">
                        {row.text}
                      </p>
                      <Button variant="outline" className="gap-2" onClick={() => navigate("/auth")}>
                        Conhecer mais <ChevronRight className="h-4 w-4" />
                      </Button>
                    </motion.div>
                    <motion.div
                      {...getAnimationProps(1)}
                      viewport={{ once: true }}
                      className={`relative ${row.reverse ? 'md:order-1' : 'md:order-2'}`}
                    >
                      <div className="rounded-2xl overflow-hidden shadow-xl border border-border aspect-video bg-muted/20">
                        <img 
                          src={row.image} 
                          alt={row.title} 
                          loading="lazy" 
                          className={`w-full h-full ${style.imageFit === 'contain' ? 'object-contain' : 'object-cover'}`} 
                        />
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (section.tipo === 'funcionalidades') {
          return (
            <section key={section.id} id="funcionalidades" className={`px-4 sm:px-6 md:px-12 py-14 sm:py-20 relative overflow-hidden ${bgClass}`}>
              <div className="max-w-6xl mx-auto relative z-10">
                <div className={`mb-12 sm:mb-16 ${textAlignClass}`}>
                  <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">{section.titulo}</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">Ferramentas desenhadas especificamente para o sistema de ensino angolano.</p>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${style.columns || 4} gap-6`}>
                  {section.conteudo.items?.map((f: any, i: number) => (
                    <motion.div
                      key={i}
                      {...getAnimationProps(i)}
                      viewport={{ once: true }}
                      whileHover={{ y: -5 }}
                      className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {renderIcon(f.icon)}
                      </div>
                      <h3 className="text-lg font-bold mb-2 text-foreground">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if (section.tipo === 'voce-sabia') {
          return (
            <section key={section.id} className={`px-4 sm:px-6 md:px-12 py-14 sm:py-20 border-y border-border ${bgClass}`}>
              <div className="max-w-6xl mx-auto">
                <div className={`flex items-center gap-3 mb-10 ${style.textAlign === 'center' ? 'justify-center' : ''}`}>
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Lightbulb className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">{section.titulo}</h2>
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-${style.columns || 2} gap-6`}>
                  {section.conteudo.items?.map((v: any, i: number) => (
                    <motion.div
                      key={i}
                      {...getAnimationProps(i)}
                      viewport={{ once: true }}
                      className="flex gap-4 p-5 rounded-2xl bg-card border border-border/50"
                    >
                      <div className="mt-1">
                        {renderIcon(v.icon)}
                      </div>
                      <p className={`text-sm sm:text-base text-muted-foreground leading-relaxed ${textAlignClass}`}>
                        {v.fact.split(v.highlight).map((part: string, j: number, arr: any[]) => (
                          <span key={j}>
                            {part}
                            {j < arr.length - 1 && <span className="text-primary font-bold">{v.highlight}</span>}
                          </span>
                        ))}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        return null;
      })}

      {/* Planos */}
      <section id="planos" className="px-4 sm:px-6 md:px-12 py-14 sm:py-20 bg-background">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <Badge variant="outline" className="text-primary border-primary/30 mb-4">Preços</Badge>
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-3 text-foreground">Planos & Preços</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Escolha o plano ideal para o seu nível de estudo.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {(["gratuito", "basico", "intermedio", "profissional", "premium"] as PlanKey[]).map((key, i) => {
              const cfg = PLAN_CONFIGS[key];
              const isPopular = key === "intermedio";
              const fmt = (v: number) => v === -1 ? "∞" : v === 0 ? "—" : String(v);
              return (
                <motion.div 
                  key={key} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className={`relative flex flex-col rounded-2xl border p-5 transition-all duration-300 ${isPopular ? "border-primary bg-primary/5 shadow-lg scale-[1.02]" : "border-border bg-card hover:shadow-lg hover:border-primary/20"}`}
                >
                  {isPopular && <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">Popular</Badge>}
                  {key === "premium" && <Crown className="h-4 w-4 text-primary mb-1" />}
                  <h3 className="font-display font-bold text-foreground">{cfg.nome}</h3>
                  <p className="text-2xl font-extrabold text-foreground mt-1">
                    {cfg.label_preco}
                    {cfg.preco > 0 && <span className="text-xs font-normal text-muted-foreground">/mês</span>}
                  </p>
                  <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground flex-1">
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> {fmt(cfg.limite_trabalhos)} trabalhos</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> {fmt(cfg.limite_resumos)} resumos</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> {fmt(cfg.limite_questionarios)} questionários</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> {fmt(cfg.limite_planos_aula)} planos aula</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> {fmt(cfg.limite_tfc)} TFCs</li>
                    {cfg.suporte_prioritario && <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> Suporte prioritário</li>}
                  </ul>
                  <Button size="sm" variant={isPopular ? "default" : "outline"} className="mt-4 w-full" onClick={() => navigate("/auth")}>
                    {cfg.preco === 0 ? "Começar grátis" : "Escolher plano"}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 md:px-12 py-14 sm:py-20">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center bg-primary rounded-3xl p-6 sm:p-10 md:p-14 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-blue-700 opacity-100" />
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-primary-foreground mb-3">Pronto para começar?</h2>
            <p className="text-primary-foreground/80 mb-6 max-w-md mx-auto">Junte-se a milhares de estudantes e professores angolanos que já usam o Delle.</p>
            <Button size="lg" className="gap-2 px-6 bg-white text-primary hover:bg-white/90" onClick={() => navigate("/auth")}>
              Criar conta grátis <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-8 border-t border-border bg-card">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <DelleLogo size={24} />
          <p className="text-xs text-muted-foreground">© 2026 Delle. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <Button variant="link" size="sm" className="text-xs text-muted-foreground h-auto p-0">Termos</Button>
            <Button variant="link" size="sm" className="text-xs text-muted-foreground h-auto p-0">Privacidade</Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
