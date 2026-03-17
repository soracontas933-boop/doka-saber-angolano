import { useState, useRef } from "react";
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
  planKey: PlanKey;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const PagamentoManualDialog = ({ open, onOpenChange, planKey }: PagamentoManualDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cfg = PLAN_CONFIGS[planKey];

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
          plano: planKey,
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Pagamento Manual
          </DialogTitle>
          <DialogDescription>
            Transfira o valor para uma das contas abaixo e envie o comprovativo
          </DialogDescription>
        </DialogHeader>

        {/* Selected Plan */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground mb-1">Plano Selecionado</p>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">{cfg.nome}</span>
            <Badge variant="secondary" className="text-sm font-bold">
              {cfg.label_preco}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* IBAN */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            IBAN - Banco X Angola
          </div>
          <div className="rounded-md bg-muted px-3 py-2">
            <p className="text-sm font-mono text-foreground select-all">AO06 0000 0000 0000 0000 0000 0</p>
          </div>
          <p className="text-xs text-muted-foreground">Titular: Doka Educação Lda</p>
        </div>

        <Separator />

        {/* Multicaixa Express */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Smartphone className="h-4 w-4 text-primary" />
            Multicaixa Express
          </div>
          <div className="rounded-md bg-muted px-3 py-2">
            <p className="text-sm font-mono text-foreground select-all">923 000 000</p>
          </div>
        </div>

        <Separator />

        {/* File Upload */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Carregar Comprovativo</Label>
          <div
            className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : file
                ? "border-primary/50 bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm text-foreground truncate max-w-[200px]">{file.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="p-1 rounded-full hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Clique para escolher ou arraste o ficheiro</p>
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
          <p className="text-[11px] text-muted-foreground">JPEG, PNG, PDF ou Word (máx. 5MB)</p>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email-confirm" className="text-sm font-medium">
            Seu Email (para confirmação)
          </Label>
          <Input
            id="email-confirm"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Info */}
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Após verificação do comprovativo, o seu plano será activado em até 24 horas úteis. 
          Receberá uma notificação por email quando o processo for concluído.
        </p>

        {/* Submit */}
        <Button onClick={handleSubmit} disabled={submitting} className="w-full">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              A submeter...
            </>
          ) : (
            "Submeter Pagamento"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default PagamentoManualDialog;
