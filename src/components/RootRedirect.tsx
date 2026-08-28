import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import PuzzleLoadingScreen from "./PuzzleLoadingScreen";

const RootRedirect = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PuzzleLoadingScreen label="A abrir o Doka-Saber Angolano…" />;
  }

  // Se o usuário está autenticado, redireciona para /home (página inicial do app)
  if (user) {
    return <Navigate to="/home" replace />;
  }

  // Se não está autenticado, redireciona para /landing (página de marketing)
  return <Navigate to="/landing" replace />;
};

export default RootRedirect;
