import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import HomePage from "@/pages/HomePage";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
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
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/setup-api-keys" element={<ApiKeysSetup />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/meus-projetos" element={<MeusProjetosPage />} />
            <Route path="/trabalho" element={<TrabalhoPage />} />
            <Route path="/resumo" element={<ResumoPage />} />
            <Route path="/questionario" element={<QuestionarioPage />} />
            <Route path="/plano-aula" element={<PlanoAulaPage />} />
            <Route path="/correcao" element={<CorrecaoPage />} />
            <Route path="/admin" element={<AdminPanelPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
            <Route path="/planos" element={<PlanosPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
