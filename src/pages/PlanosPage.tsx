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

// Estima quantas acções típicas se podem fazer com X créditos
const exampleUsage = (credits: number | -1) => {
  if (credits === -1) return ["Uso ilimitado", "Fair use: 200 ações/dia"];
  return [
    `≈ ${Math.floor(credits / CREDIT_COSTS.trabalho)} Trabalhos`,
    `≈ ${Math.floor(credits / CREDIT_COSTS.resumo)} Resumos`,
    `≈ ${Math.floor(credits / CREDIT_COSTS.questionario)} Questionários`,
  ];
};

const PlanosPage = () => {
  const { plan, loading } = useUserPlan();
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [paymentLinks, setPaymentLinks] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const currentPlanKey = (plan?.plano || "gratuito") as PlanKey;

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from("payment_settings") as any)
        .select("chave, valor")
        .in("chave", ["link_basico", "link_intermedio", "link_profissional", "link_premium"]);
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((d: any) => { map[d.chave] = d.valor; });
        setPaymentLinks(map);
      }
    })();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="h-7 w-7 text-primary" />
            <h1 className="text-2xl md:text-3xl font-display font-bold">Planos e Preços</h1>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Sistema simples baseado em créditos. Cada acção custa um valor fixo. Quanto mais créditos, mais conteúdo podes gerar.
          </p>
          <p className="text-sm mt-3 text-muted-foreground">
            Plano actual: <span className="text-primary font-semibold">{PLAN_CONFIGS[currentPlanKey].nome}</span>
          </p>
        </div>
      </motion.div>

      {/* Custo por ação */}
      <div className="rounded-2xl border border-border bg-card p-5 mb-8">
        <h3 className="font-semibold text-card-foreground mb-3 text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> Custo por acção
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {Object.entries(CREDIT_COSTS).map(([key, cost]) => (
            <div key={key} className="flex flex-col items-center justify-center rounded-lg bg-secondary/40 px-2 py-3 text-center">
              <span className="text-base font-bold text-primary">{cost}</span>
              <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {MODULE_LABELS[key as keyof typeof MODULE_LABELS]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Planos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        {planOrder.map((key, i) => {
          const cfg = PLAN_CONFIGS[key];
          const isCurrent = key === currentPlanKey;
          const isPopular = key === popularPlan;
          const credits = cfg.creditos_totais;
          const examples = exampleUsage(credits as any);

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`relative flex flex-col rounded-2xl border p-5 transition-shadow ${
                isPopular ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border shadow-card hover:shadow-card-hover"
              } bg-card`}
            >
              {isPopular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-2">
                  <Star className="h-3 w-3 mr-1" /> Mais Popular
                </Badge>
              )}
              {isCurrent && (
                <Badge variant="outline" className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] px-2">Atual</Badge>
              )}

              <h3 className="text-base font-display font-bold text-card-foreground mt-1">{cfg.nome}</h3>
              <div className="mt-2 mb-3">
                <span className="text-2xl font-bold text-foreground">{cfg.preco === 0 ? "Grátis" : cfg.label_preco}</span>
                {cfg.preco > 0 && <span className="text-[10px] text-muted-foreground block">pagamento único</span>}
              </div>

              {/* Créditos em destaque */}
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 mb-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-xl font-bold text-primary">
                    {credits === -1 ? "∞" : credits}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {credits === -1 ? "créditos ilimitados" : "créditos totais"}
                </p>
              </div>

              <ul className="space-y-1.5 flex-1 text-[11px]">
                {examples.map((ex, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-card-foreground">
                    <Check className="h-3 w-3 text-primary flex-shrink-0" />
                    <span>{ex}</span>
                  </li>
                ))}
                {cfg.suporte_prioritario && (
                  <li className="flex items-center gap-2 text-card-foreground">
                    <Check className="h-3 w-3 text-primary flex-shrink-0" />
                    <span>Suporte prioritário</span>
                  </li>
                )}
              </ul>

              <div className="mt-4 space-y-2">
                {isCurrent ? (
                  <Button variant="outline" size="sm" className="w-full text-xs" disabled>Plano Atual</Button>
                ) : key === "gratuito" ? (
                  <Button variant="outline" size="sm" className="w-full text-xs" disabled>Plano Gratuito</Button>
                ) : (
                  <div className="space-y-1.5">
                    <Button size="sm" className="w-full text-xs" variant={isPopular ? "default" : "outline"} onClick={() => setSelectedPlan(key)}>
                      Pagamento Manual
                    </Button>
                    <Button
                      size="sm"
                      className="w-full text-xs"
                      variant="secondary"
                      onClick={() => {
                        const link = paymentLinks[`link_${key}`];
                        if (link) window.open(link, "_blank");
                        else toast.info("Pagamento automático ainda não configurado para este plano.");
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

      {/* CTA pacotes extras */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-6 text-center">
        <ShoppingCart className="h-7 w-7 text-primary mx-auto mb-2" />
        <h3 className="text-lg font-bold text-foreground">Ainda precisas de mais?</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          Compra pacotes extras de créditos a qualquer momento. Os créditos somam-se ao teu saldo e não expiram.
        </p>
        <Button onClick={() => navigate("/creditos")}>
          <Zap className="h-4 w-4 mr-2" /> Ver pacotes extras
        </Button>
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
