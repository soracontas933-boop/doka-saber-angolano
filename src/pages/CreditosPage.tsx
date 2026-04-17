import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUserPlan } from "@/hooks/use-user-plan";
import { CREDIT_COSTS, MODULE_LABELS } from "@/lib/credit-costs";
import PagamentoManualDialog from "@/components/PagamentoManualDialog";

interface CreditPack {
  id: string;
  nome: string;
  creditos: number;
  preco: number;
  ativo: boolean;
}

const CreditosPage = () => {
  const { plan, loading } = useUserPlan();
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [selected, setSelected] = useState<CreditPack | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from("credit_packs") as any)
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (data) setPacks(data as CreditPack[]);
      setLoadingPacks(false);
    })();
  }, []);

  if (loading || loadingPacks) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const totalCredits = plan?.creditos_totais === -1 ? Infinity : (plan?.creditos_totais ?? 0);
  const used = plan?.creditos_usados ?? 0;
  const remaining = totalCredits === Infinity ? Infinity : Math.max(0, (totalCredits as number) - used);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap className="h-7 w-7 text-primary" />
          <h1 className="text-2xl md:text-3xl font-display font-bold">Créditos</h1>
        </div>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Compra pacotes extras de créditos. Os créditos não expiram e somam-se ao teu saldo actual.
        </p>
      </motion.div>

      {/* Saldo actual */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 mb-8 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Saldo actual</p>
        <p className="text-4xl font-bold text-primary">{remaining === Infinity ? "∞ Ilimitado" : remaining}</p>
        {totalCredits !== Infinity && (
          <p className="text-xs text-muted-foreground mt-1">{used} usados de {totalCredits as number} totais</p>
        )}
      </div>

      {/* Tabela de custos por ação */}
      <div className="mb-8 rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold text-card-foreground mb-3 text-sm">Custo por acção</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(CREDIT_COSTS).map(([key, cost]) => (
            <div key={key} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
              <span className="text-xs text-foreground">{MODULE_LABELS[key as keyof typeof MODULE_LABELS]}</span>
              <span className="text-xs font-bold text-primary">{cost}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pacotes */}
      <h2 className="text-lg font-semibold mb-4">Pacotes extras</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {packs.map((pack, i) => {
          const valorPorCredito = (pack.preco / pack.creditos).toFixed(2);
          const isPopular = i === 1;
          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`relative rounded-2xl border p-6 bg-card ${isPopular ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border shadow-card"}`}
            >
              {isPopular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
                  Melhor valor
                </Badge>
              )}
              <h3 className="font-display font-bold text-lg text-card-foreground">{pack.nome}</h3>
              <div className="mt-3 mb-4">
                <div className="flex items-baseline gap-1">
                  <Zap className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold text-foreground">{pack.creditos}</span>
                  <span className="text-sm text-muted-foreground ml-1">créditos</span>
                </div>
                <p className="text-2xl font-semibold text-primary mt-2">{pack.preco.toLocaleString()} Kz</p>
                <p className="text-[11px] text-muted-foreground">≈ {valorPorCredito} Kz por crédito</p>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground mb-4">
                <li className="flex items-center gap-2"><Check className="h-3 w-3 text-primary" /> Não expira</li>
                <li className="flex items-center gap-2"><Check className="h-3 w-3 text-primary" /> Soma ao saldo actual</li>
                <li className="flex items-center gap-2"><Check className="h-3 w-3 text-primary" /> Usar em qualquer módulo</li>
              </ul>
              <Button
                className="w-full"
                variant={isPopular ? "default" : "outline"}
                onClick={() => setSelected(pack)}
              >
                Comprar
              </Button>
            </motion.div>
          );
        })}
      </div>

      {selected && (
        <PagamentoManualDialog
          open={!!selected}
          onOpenChange={(o) => { if (!o) setSelected(null); }}
          planKey={`pack_${selected.id}` as any}
          packInfo={{ nome: selected.nome, creditos: selected.creditos, preco: selected.preco }}
        />
      )}
    </div>
  );
};

export default CreditosPage;
