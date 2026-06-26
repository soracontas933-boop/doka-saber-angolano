import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, CreditCard, Building2, Smartphone, Loader2, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_CONFIGS, type PlanKey } from "@/hooks/use-user-plan";

interface PagamentoManualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planKey: PlanKey | string;
  /** Opcional — se preenchido, o diálogo é tratado como compra de pacote de créditos. */
  packInfo?: { nome: string; creditos: number; preco: number };
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const PagamentoManualDialog = ({ open, onOpenChange, planKey, packInfo }: PagamentoManualDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [paymentInfo, setPaymentInfo] = useState({ iban: "", iban_banco: "", iban_titular: "", multicaixa_numero: "" });

  const cfg = packInfo
    ? { nome: `${packInfo.nome} (${packInfo.creditos} créditos)`, label_preco: `${packInfo.preco.toLocaleString()} Kz`, preco: packInfo.preco }
    : PLAN_CONFIGS[planKey as PlanKey];

  useEffect(() => {
    if (open) {
      // Pre-fill email from authenticated user
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email) setEmail(user.email);
      });

      (supabase.from("payment_settings") as any).select("chave, valor").then(({ data }: any) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((d: any) => { map[d.chave] = d.valor; });
          setPaymentInfo({
            iban: map["iban"] || "",
            iban_banco: map["iban_banco"] || "",
            iban_titular: map["iban_titular"] || "",
            multicaixa_numero: map["multicaixa_numero"] || "",
          });
        }
      });
    }
  }, [open]);

  const handleFileSelect = (selectedFile: File) => {
    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      toast.error("Formato não suportado. Use JPEG, PNG, PDF ou Word.");
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("Ficheiro demasiado grande. Máximo 5MB.");
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Carregue o comprovativo de pagamento.");
      return;
    }
    if (!email || !email.includes("@")) {
      toast.error("Insira um email válido.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Precisa estar autenticado.");
        return;
      }

      // Upload file
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("comprovativos")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Erro ao carregar ficheiro. Tente novamente.");
        return;
      }

      // Insert payment request
      const { error: insertError } = await (supabase.from("payment_requests") as any)
        .insert({
          user_id: user.id,
          plano: packInfo ? `pacote_${packInfo.creditos}` : planKey,
          valor: cfg.preco,
          email_confirmacao: email,
          ficheiro_url: filePath,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        toast.error("Erro ao submeter pedido. Tente novamente.");
        return;
      }

      toast.success("Pedido de pagamento submetido com sucesso! Será notificado por email após verificação.");
      onOpenChange(false);
      setFile(null);
      setEmail("");
    } catch (err) {
      console.error(err);
      toast.error("Ocorreu um erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] sm:w-[95vw] sm:max-w-md max-h-[96vh] overflow-y-auto p-4 sm:p-6 rounded-t-[2rem] sm:rounded-3xl border-0 shadow-2xl bg-white dark:bg-slate-900 bottom-0 sm:bottom-auto translate-y-0 sm:-translate-y-1/2">
        <DialogHeader className="space-y-1 sm:space-y-2 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-xl font-bold">
            <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Pagamento Manual
          </DialogTitle>
          <DialogDescription className="text-[11px] sm:text-sm text-slate-500 dark:text-slate-400">
            Transfira o valor para uma das contas abaixo e envie o comprovativo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Selected Plan */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Plano Selecionado</p>
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs sm:text-base text-slate-900 dark:text-white leading-tight">{cfg.nome}</span>
              <Badge className="bg-primary/10 text-primary border-0 text-[10px] sm:text-xs font-bold px-2 py-0.5 h-6">
                {cfg.label_preco}
              </Badge>
            </div>
          </div>

          <Separator className="bg-slate-100 dark:bg-slate-800" />

          {/* IBAN */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <Building2 className="h-4 w-4 text-primary" />
              IBAN - {paymentInfo.iban_banco || "Banco"}
            </div>
            <div className="rounded-xl bg-slate-900 dark:bg-black p-3 sm:p-4 shadow-lg">
              <p className="text-xs sm:text-base font-mono text-white select-all break-all text-center sm:text-left leading-relaxed">{paymentInfo.iban || "—"}</p>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 text-center sm:text-left font-medium">Titular: {paymentInfo.iban_titular || "—"}</p>
          </div>

          <Separator className="bg-slate-100 dark:bg-slate-800" />

          {/* Multicaixa Express */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <Smartphone className="h-4 w-4 text-primary" />
              Multicaixa Express
            </div>
            <div className="rounded-xl bg-slate-900 dark:bg-black p-3 sm:p-4 shadow-lg">
              <p className="text-xs sm:text-base font-mono text-white select-all text-center sm:text-left leading-relaxed">{paymentInfo.multicaixa_numero || "—"}</p>
            </div>
          </div>

          <Separator className="bg-slate-100 dark:bg-slate-800" />

          {/* File Upload */}
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Carregar Comprovativo</Label>
            <div
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 sm:p-8 cursor-pointer transition-all group ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : file
                  ? "border-primary/50 bg-primary/5"
                  : "border-slate-200 dark:border-slate-800 hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-slate-800/30"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="flex items-center gap-3 w-full bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-primary/10">
                  <div className="bg-primary/10 p-2 rounded-lg"><FileText className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-full mb-2 group-hover:scale-110 transition-transform">
                    <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 group-hover:text-primary" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">Carregar ficheiro</p>
                  <p className="text-[10px] text-slate-400 mt-1">PNG, JPG ou PDF (máx. 5MB)</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2 sm:space-y-3">
            <Label htmlFor="email-confirm" className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Seu Email (para confirmação)
            </Label>
            <Input
              id="email-confirm"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 sm:h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Info */}
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 border border-amber-100 dark:border-amber-900/30">
            <p className="text-[10px] sm:text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
              Após verificação do comprovativo, o seu plano será activado em até 24 horas úteis. 
              Receberá uma notificação por email quando o processo for concluído.
            </p>
          </div>

          {/* Submit */}
          <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base shadow-xl shadow-primary/20 transition-all active:scale-[0.98] hover:shadow-primary/30">
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                A submeter...
              </>
            ) : (
              "Submeter Pagamento"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PagamentoManualDialog;
