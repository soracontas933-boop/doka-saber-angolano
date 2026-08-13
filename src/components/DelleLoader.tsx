import React from "react";
import { cn } from "@/lib/utils";

interface DelleLoaderProps {
  className?: string;
}

/**
 * Componente de carregamento customizado com o polvo da Delle.
 * Substitui o Loader2 padrão do lucide-react conforme pedido do utilizador.
 */
export const DelleLoader = ({ className }: DelleLoaderProps) => {
  return (
    <img
      src="/loading-octopus.png"
      alt="Carregando..."
      className={cn("animate-spin object-contain", className)}
      style={{
        animationDuration: "2s", // Rotação suave
      }}
    />
  );
};

export default DelleLoader;
