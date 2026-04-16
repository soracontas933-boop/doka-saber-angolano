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

/* ── Dynamic Block Renderer ── */
const DynamicBlock = ({ block, sectionBg }: { block: any, sectionBg: string }) => {
  const getAnimation = (type: string) => {
    switch (type) {
      case 'fade-up': return { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 } };
      case 'fade-in': return { initial: { opacity: 0 }, whileInView: { opacity: 1 } };
      case 'zoom-in': return { initial: { opacity: 0, scale: 0.8 }, whileInView: { opacity: 1, scale: 1 } };
      case 'slide-left': return { initial: { opacity: 0, x: -50 }, whileInView: { opacity: 1, x: 0 } };
      case 'slide-right': return { initial: { opacity: 0, x: 50 }, whileInView: { opacity: 1, x: 0 } };
      default: return { initial: { opacity: 0 }, whileInView: { opacity: 1 } };
    }
  };

  const animation = getAnimation(block.style.animation || 'fade-up');

  return (
    <motion.div
      {...animation}
      transition={{ delay: block.style.delay || 0, duration: block.style.duration || 0.5 }}
      viewport={{ once: true }}
      className="absolute"
      style={{
        left: `${block.style.x}%`,
        top: `${block.style.y}%`,
        width: `${block.style.width}%`,
        zIndex: block.style.zIndex || 1,
      }}
    >
      {block.type === 'text' && (
        <div 
          style={{ 
            fontSize: `${block.style.fontSize}px`, 
            textAlign: block.style.textAlign || 'left',
            color: sectionBg === 'black' ? 'white' : 'inherit'
          }}
          className="font-display font-medium leading-relaxed"
        >
          {block.content}
        </div>
      )}
      {block.type === 'image' && block.content && (
        <img src={block.content} className="w-full h-auto rounded-xl shadow-lg" alt="Landing Element" />
      )}
      {block.type === 'video' && block.content && (
        <div className="aspect-video w-full rounded-xl overflow-hidden shadow-2xl bg-black">
          <iframe
            src={block.content.includes('youtube.com') ? block.content.replace('watch?v=', 'embed/') : block.content}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {block.type === 'button' && (
        <div className="flex" style={{ justifyContent: block.style.textAlign === 'center' ? 'center' : block.style.textAlign === 'right' ? 'flex-end' : 'flex-start' }}>
          <Button size="lg" className="rounded-full shadow-xl hover:scale-105 transition-transform">
            {block.content}
          </Button>
        </div>
      )}
    </motion.div>
  );
};

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

  const hasHeroImages = heroImages.length > 0;

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

      {/* Hero Principal (Hardcoded ou Primeiro do CMS) */}
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

      {/* Dynamic Sections from CMS */}
      {sections.map((section) => {
        const style = section.conteudo.style || {};
        const bgClass = style.bg === "card" ? "bg-card" : style.bg === "primary" ? "bg-primary/5" : style.bg === "muted" ? "bg-muted/30" : style.bg === "black" ? "bg-black" : "bg-background";
        
        return (
          <section 
            key={section.id} 
            className={`relative w-full overflow-hidden border-t border-border/50 ${bgClass}`}
            style={{ minHeight: style.height || 'auto' }}
          >
            <div className="max-w-7xl mx-auto h-full relative" style={{ minHeight: style.height || 'auto' }}>
              {section.conteudo.blocks?.map((block: any) => (
                <DynamicBlock key={block.id} block={block} sectionBg={style.bg} />
              ))}
              
              {/* Fallback para seções antigas sem blocos */}
              {(!section.conteudo.blocks || section.conteudo.blocks.length === 0) && (
                <div className="py-20 px-4 text-center">
                  <h2 className="text-3xl font-bold mb-4">{section.titulo}</h2>
                  <p className="text-muted-foreground">Esta secção ainda não tem blocos de conteúdo.</p>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <DelleLogo size={30} />
            <p className="text-sm text-muted-foreground">
              A primeira plataforma educacional feita em Angola, para Angola.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Ferramentas</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Trabalhos Escolares</li>
              <li>Resumos Inteligentes</li>
              <li>Questionários</li>
              <li>Planos de Aula</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Plataforma</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Sobre nós</li>
              <li>Preços</li>
              <li>Suporte</li>
              <li>Termos de Uso</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Acompanhe</h4>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:bg-primary hover:text-white transition-colors">F</div>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:bg-primary hover:text-white transition-colors">I</div>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:bg-primary hover:text-white transition-colors">T</div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Delle Saber Angolano. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
