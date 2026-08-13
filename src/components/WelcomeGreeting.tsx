import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cloud, Sparkles, Check } from "lucide-react";

/**
 * Componente de saudação automática para novos usuários.
 * Exibe uma mensagem de boas-vindas e explica o que é a delle.cloud.
 */
const WelcomeGreeting = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Verifica se o usuário já viu a mensagem
    const hasSeenGreeting = localStorage.getItem("delle:welcome-seen");
    
    if (!hasSeenGreeting) {
      // Pequeno atraso para não aparecer imediatamente no carregamento
      const timer = setTimeout(() => {
        setOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("delle:welcome-seen", "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) handleClose();
      setOpen(val);
    }}>
      <DialogContent className="max-w-md border-primary/20 shadow-2xl">
        <DialogHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 animate-pulse">
            <Cloud className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2 text-center">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Bem-vindo à Doka Saber Angolano! 🇦🇴
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground leading-relaxed">
              Estamos felizes por ter você aqui. Prepare-se para uma nova experiência educativa potencializada pela tecnologia.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="bg-muted/50 rounded-xl p-5 border border-border/50 space-y-3">
          <h4 className="font-semibold flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" /> O que é a delle.cloud?
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A <strong>delle.cloud</strong> é a nossa infraestrutura inteligente que potencializa a geração de conteúdos educativos, trabalhos escolares e ferramentas de apoio ao ensino.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Utilizamos inteligência artificial avançada, adaptada à realidade angolana, para facilitar a sua jornada académica de forma rápida e intuitiva.
          </p>
        </div>

        <DialogFooter className="pt-4">
          <Button className="w-full gap-2 font-semibold h-11 shadow-lg shadow-primary/20" onClick={handleClose}>
            <Check className="h-4 w-4" />
            Começar a explorar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeGreeting;
