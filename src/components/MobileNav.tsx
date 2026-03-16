import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  BookOpen,
  HelpCircle,
  ClipboardList,
  LayoutDashboard,
  FolderOpen,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";

const baseNavItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Painel" },
  { to: "/meus-projetos", icon: FolderOpen, label: "Projetos" },
  { to: "/trabalho", icon: FileText, label: "Trabalho" },
  { to: "/resumo", icon: BookOpen, label: "Resumo" },
  { to: "/questionario", icon: HelpCircle, label: "Quiz" },
  { to: "/plano-aula", icon: ClipboardList, label: "Plano" },
];

const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdmin();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navItems = !isLoading && isAdmin
    ? [...baseNavItems, { to: "/admin/usuarios", icon: ShieldCheck, label: "Master" }]
    : baseNavItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around py-2 px-1 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-medium text-destructive transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileNav;
