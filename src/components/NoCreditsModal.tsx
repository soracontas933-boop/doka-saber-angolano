import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Crown, ShoppingCart } from "lucide-react";

/**
 * Popup global que aparece quando o utilizador tenta executar uma ação
 * sem ter créditos suficientes. Escuta o evento "delle:no-credits".
 */
const NoCreditsModal = () => {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<{ needed: number; available: number }>({ needed: 0, available: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      setInfo({ needed: detail.needed ?? 0, available: detail.available ?? 0 });
      setOpen(true);
    };
    window.addEventListener("delle:no-credits", handler);
    return () => window.removeEventListener("delle:no-credits", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mb-2">
            <Zap className="h-7 w-7 text-amber-500" />
          </div>
          <DialogTitle className="text-center text-xl">Estás sem créditos suficientes 😢</DialogTitle>
          <DialogDescription className="text-center">
            Esta ação custa <span className="font-bold text-foreground">{info.needed} créditos</span> e
            só tens <span className="font-bold text-foreground">{info.available}</span>.
            Faz upgrade do plano ou compra um pacote extra para continuar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button className="w-full" onClick={() => { setOpen(false); navigate("/creditos"); }}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Comprar créditos extras
          </Button>
          <Button variant="outline" className="w-full" onClick={() => { setOpen(false); navigate("/planos"); }}>
            <Crown className="h-4 w-4 mr-2" />
            Ver planos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NoCreditsModal;
