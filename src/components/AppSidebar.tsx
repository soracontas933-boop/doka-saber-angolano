import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  BookOpen,
  HelpCircle,
  ClipboardList,
  LayoutDashboard,
  Settings,
  FolderOpen,
  LogOut,
  ShieldCheck,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
import DokaLogo from "./DokaLogo";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Painel" },
  { to: "/meus-projetos", icon: FolderOpen, label: "Meus Projetos" },
  { to: "/trabalho", icon: FileText, label: "Trabalho Escolar" },
  { to: "/resumo", icon: BookOpen, label: "Resumo" },
  { to: "/questionario", icon: HelpCircle, label: "Questionário" },
  { to: "/plano-aula", icon: ClipboardList, label: "Plano de Aula" },
  { to: "/planos", icon: CreditCard, label: "Planos" },
];

const adminNavItems = [
  { to: "/admin", icon: ShieldCheck, label: "Painel Master" },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdmin();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const renderNavItem = (item: { to: string; icon: LucideIcon; label: string }) => {
    const isActive = location.pathname === item.to;

    return (
      <NavLink
        key={item.to}
        to={item.to}
        className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150"
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute inset-0 rounded-lg bg-sidebar-accent"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}
        <item.icon className="relative z-10 h-5 w-5" />
        <span className="relative z-10">{item.label}</span>
      </NavLink>
    );
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-sidebar text-sidebar-foreground">
      <div className="p-6 flex-shrink-0">
        <DokaLogo size={36} />
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map(renderNavItem)}

        {!isLoading && isAdmin && (
          <>
            <div className="my-3 border-t border-sidebar-border" />
            {adminNavItems.map(renderNavItem)}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-sidebar-border flex-shrink-0 space-y-1">
        <NavLink
          to="/configuracoes"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium opacity-70 hover:opacity-100 transition-opacity"
        >
          <Settings className="h-5 w-5" />
          <span>Configurações</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium opacity-70 hover:opacity-100 transition-opacity text-destructive"
        >
          <LogOut className="h-5 w-5" />
          <span>Sair da Conta</span>
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
