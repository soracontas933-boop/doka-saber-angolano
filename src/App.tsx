import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import HomePage from "@/pages/HomePage";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import UserHomePage from "@/pages/UserHomePage";
import GruposPage from "@/pages/GruposPage";
import GrupoDetalhePage from "@/pages/GrupoDetalhePage";
import MeusProjetosPage from "@/pages/MeusProjetosPage";
import TrabalhoPage from "@/pages/TrabalhoPage";
import ResumoPage from "@/pages/ResumoPage";
import QuestionarioPage from "@/pages/QuestionarioPage";
import PlanoAulaPage from "@/pages/PlanoAulaPage";
import AdminPanelPage from "@/pages/AdminPanelPage";
import SettingsPage from "@/pages/SettingsPage";
import PlanosPage from "@/pages/PlanosPage";
import ApiKeysSetup from "@/pages/ApiKeysSetup";
import CorrecaoPage from "@/pages/CorrecaoPage";
import SuportePage from "@/pages/SuportePage";
import AdminMensagensPage from "@/pages/AdminMensagensPage";
import CurriculoPage from "@/pages/CurriculoPage";
import FaturamentoPage from "@/pages/FaturamentoPage";
import ApresentacaoPage from "@/pages/ApresentacaoPage";
import LivrariaPage from "@/pages/LivrariaPage";
import LivroDetalhePage from "@/pages/LivroDetalhePage";
import MinhaBibliotecaPage from "@/pages/MinhaBibliotecaPage";
import NotFound from "@/pages/NotFound";
import RootRedirect from "@/components/RootRedirect";
import CreditosPage from "@/pages/CreditosPage";
import NoCreditsModal from "@/components/NoCreditsModal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NoCreditsModal />
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/landing" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/setup-api-keys" element={<ApiKeysSetup />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/home" element={<UserHomePage />} />
                <Route path="/grupos" element={<GruposPage />} />
                <Route path="/grupos/:id" element={<GrupoDetalhePage />} />
                <Route path="/meus-projetos" element={<MeusProjetosPage />} />
                <Route path="/trabalho" element={<TrabalhoPage />} />
                <Route path="/resumo" element={<ResumoPage />} />
                <Route path="/questionario" element={<QuestionarioPage />} />
                <Route path="/plano-aula" element={<PlanoAulaPage />} />
                <Route path="/correcao" element={<CorrecaoPage />} />
                <Route path="/admin" element={<AdminPanelPage />} />
                <Route path="/configuracoes" element={<SettingsPage />} />
                <Route path="/planos" element={<PlanosPage />} />
                <Route path="/creditos" element={<CreditosPage />} />
                <Route path="/suporte" element={<SuportePage />} />
                <Route path="/mensagens" element={<AdminMensagensPage />} />
                <Route path="/curriculo" element={<CurriculoPage />} />
                <Route path="/apresentacao" element={<ApresentacaoPage />} />
                <Route path="/livraria" element={<LivrariaPage />} />
                <Route path="/livraria/:id" element={<LivroDetalhePage />} />
                <Route path="/minha-biblioteca" element={<MinhaBibliotecaPage />} />
                <Route path="/faturamento" element={<FaturamentoPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
