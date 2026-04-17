import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Crown, Check, Star, Loader2, Zap, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserPlan, PLAN_CONFIGS, type PlanKey } from "@/hooks/use-user-plan";
import { CREDIT_COSTS, MODULE_LABELS } from "@/lib/credit-costs";
import { supabase } from "@/integrations/supabase/client";
import PagamentoManualDialog from "@/components/PagamentoManualDialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const planOrder: PlanKey[] = ["gratuito", "basico", "intermedio", "profissional", "premium"];

const popularPlan: PlanKey = "profissional";

const PlanosPage = () => {
  const { plan, loading } = useUserPlan();
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [paymentLinks, setPaymentLinks] = useState<Record<string, string>>({});

  const currentPlanKey = (plan?.plano || "gratuito") as PlanKey;

  useEffect(() => {
    const fetchLinks = async () => {
      const { data } = await (supabase.from("payment_settings") as any)
        .select("chave, valor")
        .in("chave", ["link_basico", "link_intermedio", "link_profissional", "link_premium"]);
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((d: any) => { map[d.chave] = d.valor; });
        setPaymentLinks(map);
      }
    };
    fetchLinks();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="h-7 w-7 text-primary" />
            <h1 className="text-2xl md:text-3xl font-display font-bold">Planos e Preços</h1>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Escolha o plano ideal para suas necessidades. Todos os planos incluem acesso à nossa IA avançada para criação de conteúdos educacionais.
          </p>
          <p className="text-sm mt-3 text-muted-foreground">
            Seu plano atual: <span className="text-primary font-semibold">{PLAN_CONFIGS[currentPlanKey].nome}</span>
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {planOrder.map((key, i) => {
          const cfg = PLAN_CONFIGS[key];
          const isCurrent = key === currentPlanKey;
          const isPopular = key === popularPlan;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`relative flex flex-col rounded-2xl border p-5 transition-shadow ${
                isPopular
                  ? "border-primary shadow-lg ring-2 ring-primary/20"
                  : "border-border shadow-card hover:shadow-card-hover"
              } bg-card`}
            >
              {isPopular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-2">
                  <Star className="h-3 w-3 mr-1" /> Mais Popular
                </Badge>
              )}
              {isCurrent && (
                <Badge variant="outline" className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] px-2">
                  Atual
                </Badge>
              )}

              <h3 className="text-base font-display font-bold text-card-foreground mt-1">{cfg.nome}</h3>
              <div className="mt-2 mb-4">
                <span className="text-2xl font-bold text-foreground">{cfg.preco === 0 ? "Grátis" : cfg.label_preco}</span>
                {cfg.preco > 0 && (
                  <span className="text-[10px] text-muted-foreground block">pagamento único</span>
                )}
              </div>

              <ul className="space-y-2 flex-1 text-xs">
                {features.map((f) => {
                  const val = formatLimit(cfg[f.key as keyof typeof cfg] as number | boolean);
                  const available = val !== false;
                  return (
                    <li key={f.key} className={`flex items-center gap-2 ${!available ? "text-muted-foreground/50" : "text-card-foreground"}`}>
                      {available ? (
                        <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
                      )}
                      <span>
                        {f.label}
                        {typeof val === "number" || typeof val === "string" ? (
                          <span className="text-muted-foreground ml-1">({val})</span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
                {cfg.creditos_totais !== 0 && (
                  <li className="flex items-center gap-2 text-card-foreground">
                    <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span>
                      {cfg.creditos_totais === -1 ? "Créditos ilimitados" : `${cfg.creditos_totais} Créditos totais`}
                    </span>
                  </li>
                )}
              </ul>

              <div className="mt-4 space-y-2">
                {isCurrent ? (
                  <Button variant="outline" size="sm" className="w-full text-xs" disabled>
                    Plano Atual
                  </Button>
                ) : key === "gratuito" ? (
                  <Button variant="outline" size="sm" className="w-full text-xs" disabled>
                    Plano Gratuito
                  </Button>
                ) : (
                  <div className="space-y-1.5">
                    <Button
                      size="sm"
                      className="w-full text-xs"
                      variant={isPopular ? "default" : "outline"}
                      onClick={() => setSelectedPlan(key)}
                    >
                      Pagamento Manual
                    </Button>
                    <Button
                      size="sm"
                      className="w-full text-xs"
                      variant="secondary"
                      onClick={() => {
                        const link = paymentLinks[`link_${key}`];
                        if (link) {
                          window.open(link, "_blank");
                        } else {
                          toast.info("Pagamento automático ainda não configurado para este plano.");
                        }
                      }}
                    >
                      Pagamento Automático
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {selectedPlan && (
        <PagamentoManualDialog
          open={!!selectedPlan}
          onOpenChange={(open) => { if (!open) setSelectedPlan(null); }}
          planKey={selectedPlan}
        />
      )}
    </div>
  );
};

export default PlanosPage;
