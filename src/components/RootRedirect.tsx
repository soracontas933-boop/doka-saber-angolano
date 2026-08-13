import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { DelleLoader } from "./DelleLoader";

const RootRedirect = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <DelleLoader className="h-10 w-10" />
      </div>
    );
  }

  // Se o usuário está autenticado, redireciona para /home (página inicial do app)
  if (user) {
    return <Navigate to="/home" replace />;
  }

  // Se não está autenticado, redireciona para /landing (página de marketing)
  return <Navigate to="/landing" replace />;
};

export default RootRedirect;
