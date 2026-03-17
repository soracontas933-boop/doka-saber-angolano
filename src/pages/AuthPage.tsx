import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DokaLogo from "@/components/DokaLogo";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
          password,
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
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { nome: name.trim() },
            emailRedirectTo: window.location.origin,
          },
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
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="flex justify-center mb-8">
          <DokaLogo size={48} />
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
          <h1 className="text-xl font-display font-bold text-center mb-1">
            {isLogin ? "Entrar na sua conta" : "Criar conta"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {isLogin
              ? "Insira os seus dados para continuar"
              : "Preencha os campos para se registar"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  placeholder="O seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Palavra-passe</Label>
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {loading ? "A processar..." : isLogin ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline font-medium"
            >
              {isLogin ? "Não tem conta? Registe-se" : "Já tem conta? Entre"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
