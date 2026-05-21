import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AuthRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

const AuthRequiredDialog = ({
  open,
  onOpenChange,
  title = "Autenticação Necessária",
  description = "Você precisa criar uma conta ou fazer login para usar esta funcionalidade.",
}: AuthRequiredDialogProps) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    onOpenChange(false);
    navigate("/auth");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleLogin} className="gap-2">
            <LogIn className="h-4 w-4" />
            Fazer Login / Criar Conta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AuthRequiredDialog;
