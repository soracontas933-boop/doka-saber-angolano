import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import DelleLogo from "@/components/DelleLogo";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

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
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

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
        navigate("/dashboard", { replace: true });
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
        navigate("/dashboard", { replace: true });
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
      </div>);

  }

  return (
    <div className="min-h-screen px-4 py-8 flex items-center justify-center bg-[#efeff1]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm">
        
        <div className="flex justify-center mb-8">
          <DelleLogo size={48} />
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
          <h1 className="text-xl font-display font-bold text-center mb-1">
            {isLogin ? "Entrar na sua conta" : "Criar conta"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {isLogin ?
            "Insira os seus dados para continuar" :
            "Preencha os campos para se registar"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin &&
            <>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                  id="name"
                  placeholder="O seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin} />
                
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
                    onChange={(e) => setIdade(e.target.value)} />
                  
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                  id="telefone"
                  type="tel"
                  placeholder="Ex: 923 456 789"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)} />
                
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
              </>
            }

            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required />
              
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
                minLength={6} />
              
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ?
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> :
              null}
              {loading ? "A processar..." : isLogin ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline font-medium">
              
              {isLogin ? "Não tem conta? Registe-se" : "Já tem conta? Entre"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>);

};

export default AuthPage;