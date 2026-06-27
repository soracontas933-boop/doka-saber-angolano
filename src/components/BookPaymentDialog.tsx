import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  CreditCard,
  Building2,
  Smartphone,
  Loader2,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BookPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: any;
  user: any;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const BookPaymentDialog = ({
  open,
  onOpenChange,
  book,
  user,
}: BookPaymentDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [authorPaymentMethods, setAuthorPaymentMethods] = useState<any[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (user?.email) setEmail(user.email);
      loadAuthorPaymentMethods();
    }
  }, [open, user]);

  const loadAuthorPaymentMethods = async () => {
    if (!book?.criado_por) return;
    setLoadingPaymentMethods(true);

    const { data, error } = await supabase
      .from("book_payout_methods")
      .select("*")
      .eq("user_id", book.criado_por)
      .order("preferido", { ascending: false })
      .order("criado_em", { ascending: false });

    setLoadingPaymentMethods(false);

    if (error) {
      console.error("Erro ao carregar métodos de pagamento:", error);
      return;
    }

    const methods = data || [];
    setAuthorPaymentMethods(methods);

    if (book.metodo_pagamento_padrao && methods.some((m) => m.id === book.metodo_pagamento_padrao)) {
      setSelectedMethod(book.metodo_pagamento_padrao);
    } else {
      const preferredMethod = methods.find((m) => m.preferido);
      if (preferredMethod) {
        setSelectedMethod(preferredMethod.id);
      } else if (methods.length > 0) {
        setSelectedMethod(methods[0].id);
      }
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      toast({ title: "Formato não suportado", description: "Use JPEG, PNG, PDF ou Word.", variant: "destructive" });
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast({ title: "Ficheiro demasiado grande", description: "Máximo 5MB.", variant: "destructive" });
      return;
    }
    setFile(selectedFile);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({ title: "Carregue o comprovativo", variant: "destructive" });
      return;
    }
    if (!email || !email.includes("@")) {
      toast({ title: "Email inválido", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${book.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("book-receipts").upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("book_purchase_requests").insert({
        user_id: user.id,
        book_id: book.id,
        email_confirmacao: email,
        ficheiro_url: filePath,
        valor: book.preco_kz,
      });

      if (insertError) throw insertError;

      toast({ title: "Pedido enviado com sucesso! 🎉", description: "Aguarde a aprovação do admin (até 24h)." });
      onOpenChange(false);
      setFile(null);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao submeter", description: "Tente novamente mais tarde.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const getMethodDisplay = (method: any) => {
    if (method.tipo === "iban") {
      return {
        title: `IBAN - ${method.banco || "Banco"}`,
        value: method.iban,
        subtitle: `Titular: ${method.titular || "—"}`,
        icon: Building2,
      };
    }
    return {
      title: "Multicaixa Express",
      value: method.telefone,
      subtitle: "Número de telefone",
      icon: Smartphone,
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] sm:w-[95vw] sm:max-w-2xl max-h-[96vh] overflow-y-auto p-4 sm:p-8 rounded-t-[2rem] sm:rounded-[2.5rem] border-0 shadow-2xl bg-white dark:bg-slate-900 bottom-0 sm:bottom-auto translate-y-0 sm:-translate-y-1/2">
        <DialogHeader className="space-y-1 sm:space-y-2 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-2xl font-bold">
            <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Pagamento por Transferência
          </DialogTitle>
          <DialogDescription className="text-[11px] sm:text-sm text-slate-500 dark:text-slate-400">
            Transfira <span className="font-bold text-slate-900 dark:text-white">{book.preco_kz} Kz</span> e envie o comprovativo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Livro Info - Sólido */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
            {book.capa_url && (
              <img src={book.capa_url} alt={book.titulo} className="h-12 w-9 sm:h-16 sm:w-12 rounded-lg shadow-sm object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-xs sm:text-base text-slate-900 dark:text-white truncate leading-tight">{book.titulo}</p>
              <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 truncate">{book.autor}</p>
              <Badge className="mt-1 bg-primary/10 text-primary border-0 text-[9px] sm:text-xs px-2 py-0 h-5">{book.preco_kz} Kz</Badge>
            </div>
          </div>

          {/* Payment Methods */}
          {loadingPaymentMethods ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : authorPaymentMethods.length === 0 ? (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 border border-amber-100 dark:border-amber-900/30 flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-200">O autor ainda não configurou métodos de pagamento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Dados Bancários</p>
              <Tabs value={selectedMethod || ""} onValueChange={setSelectedMethod} className="w-full">
                <TabsList className="flex w-full bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl h-11 sm:h-12">
                  {authorPaymentMethods.map((method) => (
                    <TabsTrigger key={method.id} value={method.id} className="flex-1 text-[11px] sm:text-sm font-bold rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm transition-all">
                      {method.tipo === "iban" ? "IBAN" : "Express"}
                      {method.preferido && <CheckCircle className="h-3 w-3 ml-1.5 text-green-500" />}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {authorPaymentMethods.map((method) => {
                  const display = getMethodDisplay(method);
                  return (
                    <TabsContent key={method.id} value={method.id} className="mt-3 sm:mt-4">
                      <div className="bg-slate-900 dark:bg-black text-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-3 sm:space-y-4 shadow-xl border border-white/5">
                        <div className="flex justify-between items-start">
                          <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">{display.title}</p>
                          {method.preferido && <Badge className="bg-green-500 hover:bg-green-500 text-[9px] sm:text-[10px] h-4 sm:h-5 px-2">Preferido</Badge>}
                        </div>
                        <div className="bg-white/10 p-3 sm:p-4 rounded-xl break-all font-mono text-xs sm:text-base border border-white/5 select-all text-center sm:text-left leading-relaxed">
                          {display.value}
                        </div>
                        {display.subtitle && <p className="text-[10px] sm:text-xs text-slate-400 text-center sm:text-left">{display.subtitle}</p>}
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          )}

          <Separator className="bg-slate-100 dark:bg-slate-800" />

          {/* Form */}
          <div className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Seu Email para Confirmação</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="exemplo@email.com" className="h-11 sm:h-12 rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm sm:text-base focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Comprovativo</Label>
              <div
                className={`relative flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed p-5 sm:p-10 transition-all cursor-pointer group ${
                  file ? "border-primary/50 bg-primary/5" : "border-slate-200 dark:border-slate-800 hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                }`}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".jpg,.jpeg,.png,.pdf,.doc,.docx";
                  input.onchange = (e) => {
                    const f = (e.target as HTMLInputElement).files?.[0];
                    if (f) handleFileSelect(f);
                  };
                  input.click();
                }}
              >
                {file ? (
                  <div className="flex items-center gap-3 w-full bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm border border-primary/10">
                    <div className="bg-primary/10 p-2.5 rounded-xl"><FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-bold truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full hover:bg-red-50 hover:text-red-500" onClick={(e) => { e.stopPropagation(); setFile(null); }}><X className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 sm:p-4 rounded-full mb-3 group-hover:scale-110 transition-transform"><Upload className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 group-hover:text-primary" /></div>
                    <p className="text-xs sm:text-base font-bold text-slate-700 dark:text-slate-200">Carregar ficheiro</p>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-1">PNG, JPG ou PDF (máx. 5MB)</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 sm:h-14 rounded-2xl sm:rounded-[1.5rem] font-bold text-sm sm:text-base shadow-xl shadow-primary/20 transition-all active:scale-[0.98] hover:shadow-primary/30">
            {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle className="h-5 w-5 mr-2" />}
            Confirmar Pagamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookPaymentDialog;
