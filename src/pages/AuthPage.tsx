import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import DelleLogo from "@/components/DelleLogo";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ArrowLeft } from "lucide-react";
import PhoneInput from "@/components/PhoneInput";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [genero, setGenero] = useState("");
  const [idade, setIdade] = useState("");
  const [telefone, setTelefone] = useState("");
  const [telefoneValido, setTelefoneValido] = useState(false);
  const [funcao, setFuncao] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginImageUrl, setLoginImageUrl] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/home", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchLoginImage = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("valor")
        .eq("chave", "auth_login_image")
        .single();
      
      if (data?.valor) {
        setLoginImageUrl(data.valor);
      }
    };
    fetchLoginImage();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Email ou palavra-passe incorrectos.");
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success("Bem-vindo de volta!");
        navigate("/home", { replace: true });
      } else {
        if (!name.trim() || !genero || !funcao) {
          toast.error("Preencha todos os campos obrigatórios.");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              nome: name.trim(),
              genero,
              idade: idade ? parseInt(idade) : null,
              telefone: telefone.trim() || null,
              funcao
            },
            emailRedirectTo: window.location.origin
          }
        });
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Este email já está registado. Tente fazer login.");
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success("Conta criada com sucesso!");
        navigate("/home", { replace: true });
      }
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background font-apple">
      {/* Lado Esquerdo: Imagem */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 relative overflow-hidden bg-[#F5F5F7] dark:bg-[#0B0B0B]">
        <AnimatePresence mode="wait">
          <motion.div
            key={loginImageUrl || 'default'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            {loginImageUrl ? (
              <img 
                src={loginImageUrl} 
                alt="Auth Background" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#3B82F6]/10 to-transparent flex items-center justify-center">
                <div className="opacity-5"><DelleLogo size={120} /></div>
              </div>
            )}
            <div className="absolute inset-0 bg-black/10 dark:bg-black/40" />
          </motion.div>
        </AnimatePresence>
        
        <div className="absolute bottom-16 left-16 right-16 z-10 text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-8 invert brightness-0"><DelleLogo size={40} /></div>
            <h2 className="text-4xl font-bold mb-6 tracking-tight leading-[1.1] md:text-lg">
              A sua jornada educacional inteligente começa aqui.
            </h2>
            <p className="text-white/80 max-w-md font-medium text-sm">
              Aceda às melhores ferramentas de IA adaptadas ao ensino do seu país.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Lado Direito: Formulário */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col relative bg-white dark:bg-[#0B0B0B]">
        <div className="absolute top-6 left-6 md:top-10 md:left-10 z-20 bg-white">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 rounded-full hover:bg-secondary px-0" 
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao site
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 sm:p-16">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md"
          >
            <div className="md:hidden flex justify-center mb-10">
              <DelleLogo size={48} />
            </div>

            <div className="space-y-3 mb-10 text-center md:text-left">
              <h1 className="font-bold tracking-tight text-foreground text-2xl">
                {isLogin ? "Bem-vindo de volta" : "Criar nova conta"}
              </h1>
              <p className="text-muted-foreground font-medium text-sm">
                {isLogin ? 
                  "Introduza as suas credenciais para aceder à sua conta" : 
                  "Registe-se para começar a usar a plataforma"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-5 overflow-hidden"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="name" className="font-bold uppercase tracking-widest text-muted-foreground ml-1 text-xs">Nome completo *</Label>
                      <Input
                        id="name"
                        placeholder="O seu nome"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={!isLogin}
                        className="h-12 rounded-xl border-border/60 focus:ring-[#3B82F6]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-bold uppercase tracking-widest text-muted-foreground ml-1 text-xs">Género *</Label>
                        <Select value={genero} onValueChange={setGenero}>
                          <SelectTrigger className="h-12 rounded-xl border-border/60">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="feminino">Feminino</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="idade" className="font-bold uppercase tracking-widest text-muted-foreground ml-1 text-xs">Idade</Label>
                        <Input
                          id="idade"
                          type="number"
                          placeholder="Ex: 18"
                          min={10}
                          max={99}
                          value={idade}
                          onChange={(e) => setIdade(e.target.value)}
                          className="h-12 rounded-xl border-border/60"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefone" className="font-bold uppercase tracking-widest text-muted-foreground ml-1 text-xs">Telefone</Label>
                      <Input
                        id="telefone"
                        type="tel"
                        placeholder="Ex: 923 456 789"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        className="h-12 rounded-xl border-border/60"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-bold uppercase tracking-widest text-muted-foreground ml-1 text-xs">Função *</Label>
                      <Select value={funcao} onValueChange={setFuncao}>
                        <SelectTrigger className="h-12 rounded-xl border-border/60">
                          <SelectValue placeholder="Selecione a sua função" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aluno">Aluno</SelectItem>
                          <SelectItem value="professor">Professor</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold uppercase tracking-widest text-muted-foreground ml-1 text-xs">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl border-border/60 focus:ring-[#3B82F6]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-bold uppercase tracking-widest text-muted-foreground ml-1 text-xs">Palavra-passe *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-12 rounded-xl border-border/60 focus:ring-[#3B82F6]"
                />
              </div>

              <Button type="submit" className="w-full h-14 rounded-full text-white text-lg font-bold shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] bg-black" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : null}
                {loading ? "A processar..." : isLogin ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-base text-muted-foreground hover:text-[#3B82F6] transition-colors font-medium"
              >
                {isLogin ? (
                  <>Não tem conta? <span className="text-[#3B82F6] font-bold text-base">Registe-se</span></>
                ) : (
                  <>Já tem conta? <span className="text-[#3B82F6] font-bold text-base">Entre aqui</span></>
                )}
              </button>
            </div>
          </motion.div>
        </div>
        
        <div className="p-8 text-center">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest pb-0 pt-[80px]">
            © {new Date().getFullYear()} Delle. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
