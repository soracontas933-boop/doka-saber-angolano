import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import HomePage from "@/pages/HomePage";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import UserHomePage from "@/pages/UserHomePage";
import GruposPage from "@/pages/GruposPage";
import GrupoDetalhePage from "@/pages/GrupoDetalhePage";
import MeusProjetosPage from "@/pages/MeusProjetosPage";
import TrabalhoPage from "@/pages/TrabalhoPage";
import ResumoPage from "@/pages/ResumoPage";
import ResumoEditorPage from "@/pages/ResumoEditorPage";
import MindMapEditorPage from "@/pages/MindMapEditorPage";
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
import SupportNotification from "@/components/SupportNotification";
import WelcomeGreeting from "@/components/WelcomeGreeting";

const queryClient = new QueryClient();

// Wraps each route element with a page-level ErrorBoundary so that
// a crash on one page never produces a white screen across the whole app.
const withErrorBoundary = (element: React.ReactNode, label: string) => (
  <ErrorBoundary>
    <div className="min-h-screen">{element}</div>
  </ErrorBoundary>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NoCreditsModal />
          <SupportNotification />
          <WelcomeGreeting />
          <Routes>
            <Route path="/livraria/:id" element={withErrorBoundary(<LivroDetalhePage />, "Livro Detalhe")} />
            <Route path="/" element={withErrorBoundary(<RootRedirect />, "Redirecionamento")} />
            <Route path="/landing" element={withErrorBoundary(<HomePage />, "Landing")} />
            <Route path="/auth" element={withErrorBoundary(<AuthPage />, "Autenticação")} />
            <Route element={<ProtectedRoute />}>
              <Route path="/setup-api-keys" element={withErrorBoundary(<ApiKeysSetup />, "Configurar API Keys")} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={withErrorBoundary(<Dashboard />, "Dashboard")} />
                <Route path="/home" element={withErrorBoundary(<UserHomePage />, "Início")} />
                <Route path="/grupos" element={withErrorBoundary(<GruposPage />, "Grupos")} />
                <Route path="/grupos/:id" element={withErrorBoundary(<GrupoDetalhePage />, "Grupo Detalhe")} />
                <Route path="/meus-projetos" element={withErrorBoundary(<MeusProjetosPage />, "Meus Projetos")} />
                <Route path="/trabalho" element={withErrorBoundary(<TrabalhoPage />, "Trabalho")} />
                <Route path="/resumo" element={withErrorBoundary(<ResumoPage />, "Resumo")} />
                <Route path="/resumo/editar" element={withErrorBoundary(<ResumoEditorPage />, "Editar Resumo")} />
                <Route path="/resumo/mapa-mental" element={withErrorBoundary(<MindMapEditorPage />, "Mapa Mental")} />
                <Route path="/questionario" element={withErrorBoundary(<QuestionarioPage />, "Questionário")} />
                <Route path="/plano-aula" element={withErrorBoundary(<PlanoAulaPage />, "Plano de Aula")} />
                <Route path="/correcao" element={withErrorBoundary(<CorrecaoPage />, "Correção")} />
                <Route path="/admin" element={withErrorBoundary(<AdminPanelPage />, "Admin")} />
                <Route path="/configuracoes" element={withErrorBoundary(<SettingsPage />, "Configurações")} />
                <Route path="/planos" element={withErrorBoundary(<PlanosPage />, "Planos")} />
                <Route path="/creditos" element={withErrorBoundary(<CreditosPage />, "Créditos")} />
                <Route path="/suporte" element={withErrorBoundary(<SuportePage />, "Suporte")} />
                <Route path="/mensagens" element={withErrorBoundary(<AdminMensagensPage />, "Mensagens")} />
                <Route path="/curriculo" element={withErrorBoundary(<CurriculoPage />, "Currículo")} />
                <Route path="/apresentacao" element={withErrorBoundary(<ApresentacaoPage />, "Apresentação")} />
                <Route path="/livraria" element={withErrorBoundary(<LivrariaPage />, "Livraria")} />
                <Route path="/minha-biblioteca" element={withErrorBoundary(<MinhaBibliotecaPage />, "Minha Biblioteca")} />
                <Route path="/faturamento" element={withErrorBoundary(<FaturamentoPage />, "Faturamento")} />
              </Route>
            </Route>
            <Route path="*" element={withErrorBoundary(<NotFound />, "404")} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
