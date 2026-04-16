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

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [genero, setGenero] = useState("");
  const [idade, setIdade] = useState("");
  const [telefone, setTelefone] = useState("");
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Lado Esquerdo: Imagem */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 relative overflow-hidden bg-muted">
        <AnimatePresence mode="wait">
          <motion.div
            key={loginImageUrl || 'default'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            {loginImageUrl ? (
              <img 
                src={loginImageUrl} 
                alt="Auth Background" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <DelleLogo size={120} className="opacity-10" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/20" />
          </motion.div>
        </AnimatePresence>
        
        <div className="absolute bottom-12 left-12 right-12 z-10 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <DelleLogo size={40} className="mb-6 invert brightness-0" />
            <h2 className="text-3xl font-bold mb-4 font-display">
              A sua jornada educacional inteligente começa aqui.
            </h2>
            <p className="text-lg text-white/80 max-w-md">
              Aceda às melhores ferramentas de IA adaptadas ao ensino em Angola.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Lado Direito: Formulário */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col relative">
        <div className="absolute top-4 left-4 md:top-8 md:left-8 z-20">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2" 
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao site
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <div className="md:hidden flex justify-center mb-8">
              <DelleLogo size={48} />
            </div>

            <div className="space-y-2 mb-8 text-center md:text-left">
              <h1 className="text-3xl font-display font-bold tracking-tight">
                {isLogin ? "Bem-vindo de volta" : "Criar nova conta"}
              </h1>
              <p className="text-muted-foreground">
                {isLogin ? 
                  "Introduza as suas credenciais para aceder à sua conta" : 
                  "Registe-se para começar a usar a plataforma"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Nome completo *</Label>
                      <Input
                        id="name"
                        placeholder="O seu nome"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={!isLogin}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Género *</Label>
                        <Select value={genero} onValueChange={setGenero}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="feminino">Feminino</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="idade">Idade</Label>
                        <Input
                          id="idade"
                          type="number"
                          placeholder="Ex: 18"
                          min={10}
                          max={99}
                          value={idade}
                          onChange={(e) => setIdade(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        type="tel"
                        placeholder="Ex: 923 456 789"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Função *</Label>
                      <Select value={funcao} onValueChange={setFuncao}>
                        <SelectTrigger>
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

              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Palavra-passe *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {loading ? "A processar..." : isLogin ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin ? (
                  <>Não tem conta? <span className="text-primary font-semibold">Registe-se</span></>
                ) : (
                  <>Já tem conta? <span className="text-primary font-semibold">Entre aqui</span></>
                )}
              </button>
            </div>
          </motion.div>
        </div>
        
        <div className="p-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Delle Saber Angolano. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
