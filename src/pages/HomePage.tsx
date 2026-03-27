import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FileText, BookOpen, HelpCircle, ClipboardList, ArrowRight, Sparkles, Zap, Shield, Download, Check, Crown, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import DelleLogo from "@/components/DelleLogo";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { PLAN_CONFIGS, type PlanKey } from "@/hooks/use-user-plan";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const features = [
  { icon: FileText, title: "Trabalhos Escolares", desc: "Gere trabalhos completos com estrutura angolana" },
  { icon: BookOpen, title: "Resumos Inteligentes", desc: "Transforme fotos do caderno em resumos e flashcards" },
  { icon: HelpCircle, title: "Questionários", desc: "Crie questionários interativos com correção automática" },
  { icon: ClipboardList, title: "Planos de Aula", desc: "Planos no formato INIDE, prontos para usar" },
];

const stats = [
  { icon: Sparkles, label: "Conteúdo com IA", value: "Inteligente" },
  { icon: Zap, label: "Geração rápida", value: "Instantâneo" },
  { icon: Shield, label: "Formato angolano", value: "Certificado" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

interface HeroImage {
  id: string;
  url: string;
  ordem: number;
}

const HeroCarousel = ({ images }: { images: HeroImage[] }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="absolute inset-0 overflow-hidden">
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
          fetchPriority="high"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-black/60 dark:bg-black/75" />
      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === current ? "bg-primary scale-125" : "bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const HeroSingle = ({ image }: { image: HeroImage }) => (
  <div className="absolute inset-0 overflow-hidden">
    <img
      src={image.url}
      alt="Hero"
      className="absolute inset-0 w-full h-full object-cover"
      loading="eager"
      decoding="async"
      fetchPriority="high"
    />
    <div className="absolute inset-0 bg-black/60 dark:bg-black/75" />
  </div>
);

const HomePage = () => {
  const navigate = useNavigate();
  const { canInstall, install } = usePwaInstall();
  const { theme, toggleTheme } = useTheme();
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [carouselEnabled, setCarouselEnabled] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [imgRes, settingsRes] = await Promise.all([
        supabase
          .from("hero_images")
          .select("id, url, ordem")
          .eq("ativo", true)
          .order("ordem", { ascending: true }),
        supabase.from("site_settings").select("valor").eq("chave", "hero_carousel").single(),
      ]);
      setHeroImages((imgRes.data as HeroImage[]) ?? []);
      if (settingsRes.data) {
        setCarouselEnabled((settingsRes.data as any).valor === "true");
      }
    };
    load();
  }, []);

  const hasHeroImages = heroImages.length > 0;

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <header className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5">
        <WameLogo size={36} />
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-foreground">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          {canInstall && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={install}>
              <Download className="h-4 w-4" />
              Baixar App
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
            Entrar
          </Button>
          <Button size="sm" onClick={() => navigate("/auth")}>
            Começar grátis
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 md:px-12 pt-16 pb-20 max-w-5xl mx-auto text-center">
        {/* Background image(s) */}
        {hasHeroImages && (
          carouselEnabled && heroImages.length > 1 ? (
            <HeroCarousel images={heroImages} />
          ) : (
            <HeroSingle image={heroImages[0]} />
          )
        )}

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Plataforma educacional angolana com IA
          </div>

          <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight text-foreground leading-[1.1] mb-5">
            Aprenda mais,{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              estude melhor
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Gere trabalhos escolares, resumos do caderno, questionários e planos de aula 
            — tudo adaptado ao sistema educacional angolano.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="gap-2 px-6" onClick={() => navigate("/auth")}>
              Começar agora <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="px-6" onClick={() => {
              document.getElementById("funcionalidades")?.scrollIntoView({ behavior: "smooth" });
            }}>
              Ver funcionalidades
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="relative z-10 grid grid-cols-3 gap-4 mt-16 max-w-lg mx-auto"
        >
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <s.icon className="h-5 w-5 text-primary mx-auto mb-1.5" />
              <p className="text-sm font-semibold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="px-6 md:px-12 py-20 bg-card border-t border-border">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
              Tudo o que precisa, num só lugar
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Ferramentas inteligentes feitas para estudantes e professores angolanos.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={item}
                className="group flex gap-4 p-5 rounded-2xl border border-border bg-background hover:shadow-card-hover transition-shadow duration-200"
              >
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="px-6 md:px-12 py-20 bg-background">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
              Planos & Preços
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Escolha o plano ideal para o seu nível de estudo.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
          >
            {(["gratuito", "basico", "intermedio", "profissional", "premium"] as PlanKey[]).map((key, i) => {
              const cfg = PLAN_CONFIGS[key];
              const isPopular = key === "intermedio";
              const fmt = (v: number) => (v === -1 ? "∞" : v === 0 ? "—" : String(v));

              return (
                <motion.div
                  key={key}
                  variants={item}
                  className={`relative flex flex-col rounded-2xl border p-5 transition-shadow duration-200 ${
                    isPopular
                      ? "border-primary bg-primary/5 shadow-lg scale-[1.02]"
                      : "border-border bg-card hover:shadow-card-hover"
                  }`}
                >
                  {isPopular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
                      Popular
                    </Badge>
                  )}
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
                    {cfg.suporte_prioritario && (
                      <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> Suporte prioritário</li>
                    )}
                  </ul>

                  <Button
                    size="sm"
                    variant={isPopular ? "default" : "outline"}
                    className="mt-4 w-full"
                    onClick={() => navigate("/auth")}
                  >
                    {cfg.preco === 0 ? "Começar grátis" : "Escolher plano"}
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary to-secondary rounded-3xl p-10 md:p-14"
        >
          <h2 className="text-2xl md:text-3xl font-display font-bold text-secondary-foreground mb-3">
            Pronto para começar?
          </h2>
          <p className="text-secondary-foreground/80 mb-6 max-w-md mx-auto">
            Junte-se a milhares de estudantes e professores angolanos que já usam o Wame.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="gap-2 px-6 bg-background text-foreground hover:bg-background/90"
            onClick={() => navigate("/auth")}
          >
            Criar conta grátis <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-8 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <WameLogo size={28} />
          <p className="text-xs text-muted-foreground">
            © 2026 Wame — Plataforma Educacional Angolana. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
