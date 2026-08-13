import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { DelleLoader } from "./DelleLoader";

const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <DelleLoader className="h-10 w-10" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
