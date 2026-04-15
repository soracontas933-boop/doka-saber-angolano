import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FileText, BookOpen, HelpCircle, ClipboardList, ArrowRight, Sparkles, Zap, Shield, Download, Check, Crown, Moon, Sun, Lightbulb, GraduationCap, Users, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import DelleLogo from "@/components/DelleLogo";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { PLAN_CONFIGS, type PlanKey } from "@/hooks/use-user-plan";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FloatingPaths } from "@/components/ui/background-paths";
import sobreEstudantes from "@/assets/sobre-estudantes.jpg";
import sobreProfessor from "@/assets/sobre-professor.jpg";

/* ── static data ── */
const features = [
{ icon: FileText, title: "Trabalhos Escolares", desc: "Gere trabalhos completos com capa, índice, introdução e conclusão no formato angolano." },
{ icon: BookOpen, title: "Resumos Inteligentes", desc: "Transforme fotos do caderno em resumos estruturados e flashcards de estudo." },
{ icon: HelpCircle, title: "Questionários", desc: "Crie questionários interativos com correção automática e gabaritos." },
{ icon: ClipboardList, title: "Planos de Aula", desc: "Planos no formato INIDE, prontos para entregar e usar na sala de aula." }];


const stats = [
{ icon: Sparkles, label: "Conteúdo com IA", value: "Inteligente" },
{ icon: Zap, label: "Geração rápida", value: "Instantâneo" },
{ icon: Shield, label: "Formato angolano", value: "Certificado" }];


const voceSabia = [
{ icon: Lightbulb, fact: "Estudantes que usam resumos estruturados memorizam até 40% mais conteúdo.", highlight: "40% mais" },
{ icon: GraduationCap, fact: "Professores poupam em média 3 horas por semana usando planos de aula automáticos.", highlight: "3 horas" },
{ icon: Users, fact: "Trabalhos em grupo com ferramentas digitais têm 60% mais chances de ter nota máxima.", highlight: "60% mais" },
{ icon: Star, fact: "Angola tem mais de 10 milhões de estudantes — a Delle foi feita para cada um deles.", highlight: "10 milhões" }];


const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

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
    </h1>);

};

/* ── Hero carousel / single ── */
const HeroCarousel = ({ images }: {images: HeroImage[];}) => {
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
    </div>);

};

const HeroSingle = ({ image }: {image: HeroImage;}) =>
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

  useEffect(() => {
    const load = async () => {
      const [imgRes, settingsRes] = await Promise.all([
      supabase.from("hero_images").select("id, url, ordem").eq("ativo", true).order("ordem", { ascending: true }),
      supabase.from("site_settings").select("valor").eq("chave", "hero_carousel").single()]
      );
      setHeroImages(imgRes.data as HeroImage[] ?? []);
      if (settingsRes.data) setCarouselEnabled((settingsRes.data as any).valor === "true");
    };
    load();
  }, []);

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

          <p className="sm:text-lg md:text-xl max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed px-2 text-sm text-[#a7abb4]">Gere trabalhos escolares, resumos de conteúdo, questionários e planos de aula 

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
          
          {stats.map((s) =>
          <div key={s.label} className="text-center">
              <s.icon className="h-5 w-5 text-primary mx-auto mb-1.5" />
              <p className="text-sm font-semibold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          )}
        </motion.div>
      </section>

      {/* Sobre / About */}
      <section className="px-4 sm:px-6 md:px-12 py-14 sm:py-20 bg-card border-t border-border overflow-hidden">
        <div className="max-w-6xl mx-auto space-y-16">
          {/* Row 1: Text + Image */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="space-y-5">
              <Badge variant="outline" className="text-primary border-primary/30">Sobre a Delle</Badge>
              <h2 className="text-2xl md:text-4xl font-display font-bold text-foreground leading-tight">
                A primeira plataforma educacional feita <span className="text-primary">em Angola, para Angola</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                A Delle nasceu da necessidade de modernizar o ensino angolano. Combinamos inteligência artificial com o currículo nacional para criar ferramentas que realmente fazem diferença na vida de estudantes e professores.
              </p>
              <Button variant="outline" className="gap-2" onClick={() => navigate("/auth")}>
                Conhecer mais <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="rounded-2xl overflow-hidden shadow-xl border border-border">
                <img src={sobreEstudantes} alt="Estudantes angolanos a aprender com tecnologia" loading="lazy" width={800} height={600} className="w-full h-auto object-cover" />
              </div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                viewport={{ once: true }}
                className="absolute -bottom-4 -left-4 bg-primary text-primary-foreground px-4 py-2 rounded-xl shadow-lg text-sm font-semibold"
              >
                🇦🇴 Feito em Angola
              </motion.div>
            </motion.div>
          </div>

          {/* Row 2: Image + Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40, scale: 0.9 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              className="relative order-2 md:order-1"
            >
              <div className="rounded-2xl overflow-hidden shadow-xl border border-border">
                <img src={sobreProfessor} alt="Professor angolano usando tecnologia na sala de aula" loading="lazy" width={800} height={600} className="w-full h-auto object-cover" />
              </div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                viewport={{ once: true }}
                className="absolute -bottom-4 -right-4 bg-card text-foreground px-4 py-2 rounded-xl shadow-lg text-sm font-semibold border border-border"
              >
                <GraduationCap className="inline h-4 w-4 mr-1 text-primary" /> Para professores
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              viewport={{ once: true }}
              className="space-y-5 order-1 md:order-2"
            >
              <p className="text-muted-foreground leading-relaxed">
                Desde trabalhos escolares no formato ABNT/INIDE até planos de aula completos, cada funcionalidade foi pensada para poupar tempo e melhorar a qualidade do trabalho académico.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "5+", label: "Ferramentas IA" },
                  { value: "24/7", label: "Disponível" },
                  { value: "100%", label: "Formato angolano" },
                  { value: "0 Kz", label: "Para começar" },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    viewport={{ once: true }}
                    className="text-center p-4 bg-background/80 rounded-2xl border border-border"
                  >
                    <p className="text-2xl md:text-3xl font-display font-bold text-primary">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="px-4 sm:px-6 md:px-12 py-14 sm:py-20 bg-background">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <Badge variant="outline" className="text-primary border-primary/30 mb-4">Funcionalidades</Badge>
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-3 text-foreground">Tudo o que precisa, num só lugar</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Ferramentas inteligentes feitas para estudantes e professores angolanos.</p>
          </motion.div>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f) =>
            <motion.div key={f.title} variants={item} className="group flex gap-4 p-5 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Você Sabia? */}
      <section className="px-4 sm:px-6 md:px-12 py-14 sm:py-20 bg-card border-t border-border">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <Badge variant="outline" className="text-primary border-primary/30 mb-4">💡 Você Sabia?</Badge>
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-3 text-foreground">Factos que vão te convencer</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Descubra porque milhares de estudantes já escolheram a Delle.</p>
          </motion.div>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {voceSabia.map((v, i) =>
            <motion.div
              key={i}
              variants={item}
              className="relative overflow-hidden rounded-2xl border border-border bg-background p-6 hover:border-primary/30 transition-all duration-300">
              
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <v.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground leading-relaxed">
                      {v.fact.split(v.highlight).map((part, pi, arr) =>
                    <span key={pi}>
                          {part}
                          {pi < arr.length - 1 && <span className="font-bold text-primary">{v.highlight}</span>}
                        </span>
                    )}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="px-4 sm:px-6 md:px-12 py-14 sm:py-20 bg-background">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <Badge variant="outline" className="text-primary border-primary/30 mb-4">Preços</Badge>
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-3 text-foreground">Planos & Preços</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Escolha o plano ideal para o seu nível de estudo.</p>
          </motion.div>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {(["gratuito", "basico", "intermedio", "profissional", "premium"] as PlanKey[]).map((key) => {
              const cfg = PLAN_CONFIGS[key];
              const isPopular = key === "intermedio";
              const fmt = (v: number) => v === -1 ? "∞" : v === 0 ? "—" : String(v);
              return (
                <motion.div key={key} variants={item} className={`relative flex flex-col rounded-2xl border p-5 transition-all duration-300 ${isPopular ? "border-primary bg-primary/5 shadow-lg scale-[1.02]" : "border-border bg-card hover:shadow-lg hover:border-primary/20"}`}>
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
                </motion.div>);

            })}
          </motion.div>
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
          <DelleLogo size={28} />
          <p className="text-xs text-muted-foreground">© 2026 Delle — Plataforma Educacional Angolana. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Mobile install button - fixed */}
      {canInstall &&
      <div className="sm:hidden fixed bottom-4 left-4 right-4 z-50">
          <Button className="w-full gap-2 bg-primary shadow-lg" size="lg" onClick={install}>
            <Download className="h-5 w-5" /> Baixar App
          </Button>
        </div>
      }
    </div>);

};

export default HomePage;