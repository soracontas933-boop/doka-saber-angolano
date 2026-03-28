import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  BookOpen,
  HelpCircle,
  ClipboardList,
  Search,
  LayoutDashboard,
  FolderOpen,
  LogOut,
  ShieldCheck,
  CreditCard,
  LifeBuoy,
  MessageSquare,
  Home,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";

const adminNavItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Painel" },
  { to: "/meus-projetos", icon: FolderOpen, label: "Projetos" },
  { to: "/trabalho", icon: FileText, label: "Trabalho" },
  { to: "/resumo", icon: BookOpen, label: "Resumo" },
  { to: "/questionario", icon: HelpCircle, label: "Quiz" },
  { to: "/plano-aula", icon: ClipboardList, label: "Plano" },
  { to: "/correcao", icon: Search, label: "Corrigir" },
  { to: "/planos", icon: CreditCard, label: "Planos" },
];

const userNavItems = [
  { to: "/home", icon: Home, label: "Início" },
  { to: "/trabalho", icon: FileText, label: "Trabalho" },
  { to: "/curriculo", icon: FileText, label: "CV" },
  { to: "/resumo", icon: BookOpen, label: "Resumo" },
  { to: "/questionario", icon: HelpCircle, label: "Quiz" },
  { to: "/plano-aula", icon: ClipboardList, label: "Plano" },
  { to: "/correcao", icon: Search, label: "Corrigir" },
  { to: "/grupos", icon: Users, label: "Grupos" },
  { to: "/planos", icon: CreditCard, label: "Planos" },
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
    ? [...adminNavItems, { to: "/mensagens", icon: MessageSquare, label: "Msgs" }, { to: "/admin", icon: ShieldCheck, label: "Master" }]
    : [...userNavItems, { to: "/suporte", icon: LifeBuoy, label: "Suporte" }];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center py-1.5 px-1 overflow-x-auto scrollbar-hide gap-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 min-w-[3rem] px-1.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
              <span className="truncate max-w-[3rem]">{item.label}</span>
            </NavLink>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 min-w-[3rem] px-1.5 py-1 rounded-lg text-[10px] font-medium text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileNav;
