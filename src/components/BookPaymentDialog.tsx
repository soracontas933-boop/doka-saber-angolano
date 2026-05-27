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
  const [isAdminBook, setIsAdminBook] = useState(false);

  useEffect(() => {
    if (open) {
      // Pre-fill email from authenticated user
      if (user?.email) setEmail(user.email);

      loadAuthorPaymentMethods();
    }
  }, [open, user]);

  const loadAuthorPaymentMethods = async () => {
    if (!book?.criado_por) return;
    setLoadingPaymentMethods(true);

    // Verificar se o livro foi criado por um admin
    const { data: authorProfile } = await supabase
      .from("profiles")
      .select("funcao")
      .eq("id", book.criado_por)
      .maybeSingle();

    const isAdmin = authorProfile?.funcao === "admin" || book.criado_por === "admin";
    setIsAdminBook(isAdmin);

    // Carregar métodos de pagamento do autor
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

    // Pré-selecionar o método pré-definido do livro (se configurado pelo admin)
    if (book.metodo_pagamento_padrao && methods.some((m) => m.id === book.metodo_pagamento_padrao)) {
      setSelectedMethod(book.metodo_pagamento_padrao);
    } else {
      // Fallback: selecionar o método preferido do autor
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
      toast({
        title: "Formato não suportado",
        description: "Use JPEG, PNG, PDF ou Word.",
        variant: "destructive",
      });
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast({
        title: "Ficheiro demasiado grande",
        description: "Máximo 5MB.",
        variant: "destructive",
      });
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
      toast({
        title: "Carregue o comprovativo",
        description: "Selecione um ficheiro para continuar.",
        variant: "destructive",
      });
      return;
    }
    if (!email || !email.includes("@")) {
      toast({
        title: "Email inválido",
        description: "Insira um email válido.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Upload file
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${book.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("book-receipts")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast({
          title: "Erro ao carregar ficheiro",
          description: "Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("book-receipts")
        .getPublicUrl(filePath);

      // Insert payment request
      const { error: insertError } = await supabase
        .from("book_purchase_requests")
        .insert({
          user_id: user.id,
          book_id: book.id,
          email_confirmacao: email,
          ficheiro_url: publicUrl,
          valor: book.preco_kz,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        toast({
          title: "Erro ao submeter pedido",
          description: "Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Pedido enviado com sucesso! 🎉",
        description:
          "Aguarde a aprovação do admin (até 24h). Receberá uma notificação por email.",
      });
      onOpenChange(false);
      setFile(null);
      setEmail("");
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro inesperado",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
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

  const selectedMethodData = authorPaymentMethods.find(
    (m) => m.id === selectedMethod
  );
  const selectedDisplay = selectedMethodData ? getMethodDisplay(selectedMethodData) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CreditCard className="h-5 w-5 text-primary" />
            Pagar por Comprovativo
          </DialogTitle>
          <DialogDescription className="text-sm">
            Transfira <span className="font-bold text-foreground">{book.preco_kz} Kz</span> para a conta selecionada e envie o comprovativo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Livro Info */}
          <Card className="bg-gradient-to-r from-primary/5 to-blue-500/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                {book.capa_url && (
                  <img
                    src={book.capa_url}
                    alt={book.titulo}
                    className="h-16 w-12 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{book.titulo}</p>
                  <p className="text-sm text-muted-foreground">por {book.autor}</p>
                  <Badge variant="secondary" className="mt-1">
                    {book.preco_kz} Kz
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods Selection */}
          {loadingPaymentMethods ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : authorPaymentMethods.length === 0 ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Nenhum método configurado</p>
                <p className="text-sm text-yellow-800">
                  O autor não configurou métodos de pagamento. Contacte o suporte.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Selecione o método de pagamento:
              </p>
              <Tabs
                value={selectedMethod || ""}
                onValueChange={setSelectedMethod}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
                  {authorPaymentMethods.map((method) => (
                    <TabsTrigger key={method.id} value={method.id} className="text-xs">
                      {method.tipo === "iban" ? (
                        <>
                          <Building2 className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">IBAN</span>
                        </>
                      ) : (
                        <>
                          <Smartphone className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Multicaixa</span>
                        </>
                      )}
                      {method.preferido && <CheckCircle className="h-3 w-3 ml-1 text-green-500" />}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {authorPaymentMethods.map((method) => {
                  const display = getMethodDisplay(method);
                  const Icon = display.icon;
                  return (
                    <TabsContent key={method.id} value={method.id} className="space-y-3">
                      <Card className="border-primary/20 bg-primary/5">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                              <Icon className="h-4 w-4 text-primary" />
                              {display.title}
                            </CardTitle>
                            {method.preferido && (
                              <Badge variant="default" className="bg-green-600">
                                Preferido
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Dados para transferência:</p>
                            <div className="bg-white rounded-lg border border-border p-3 font-mono text-sm break-all select-all">
                              {display.value}
                            </div>
                          </div>
                          {display.subtitle && (
                            <p className="text-xs text-muted-foreground">{display.subtitle}</p>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          )}

          <Separator />

          {/* File Upload */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Carregar Comprovativo</Label>
            <div
              className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-all ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : file
                  ? "border-primary/50 bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
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
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="flex items-center gap-2 w-full">
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="p-1 rounded-full hover:bg-muted flex-shrink-0"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">Clique ou arraste o ficheiro</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPEG, PNG, PDF ou Word (máx. 5MB)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email-confirm" className="text-sm font-medium">
              Email para Confirmação
            </Label>
            <Input
              id="email-confirm"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Info Message */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-xs text-blue-900 leading-relaxed">
              <span className="font-medium">⏱️ Tempo de processamento:</span> Após verificação do comprovativo, o livro será libertado em até 24 horas úteis. Receberá uma notificação por email quando o processo for concluído.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !file || !email || authorPaymentMethods.length === 0}
            className="w-full h-11 rounded-lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                A submeter...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Submeter Pagamento
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookPaymentDialog;
