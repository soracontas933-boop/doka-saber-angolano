import { Zap } from "lucide-react";
import { CREDIT_COSTS, type ModuloType } from "@/lib/credit-costs";

interface Props {
  modulo: ModuloType;
  className?: string;
}

/** Badge pequeno que mostra o custo em créditos da ação. Usar dentro de botões de geração. */
const CreditCostBadge = ({ modulo, className = "" }: Props) => {
  const cost = CREDIT_COSTS[modulo];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] font-semibold ${className}`}
      title={`Esta ação custa ${cost} créditos`}
    >
      <Zap className="h-3 w-3" />
      {cost}
    </span>
  );
};

export default CreditCostBadge;
