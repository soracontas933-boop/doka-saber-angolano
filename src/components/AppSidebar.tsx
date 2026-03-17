import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  BookOpen,
  HelpCircle,
  ClipboardList,
  Search,
  LayoutDashboard,
  Settings,
  FolderOpen,
  LogOut,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Crown,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
import { Badge } from "@/components/ui/badge";

import DokaLogo from "./DokaLogo";
import { useState } from "react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", adminOnly: true },
  { to: "/meus-projetos", icon: FolderOpen, label: "Meus Projetos" },
  { to: "/trabalho", icon: FileText, label: "Trabalho Escolar" },
  { to: "/resumo", icon: BookOpen, label: "Resumo" },
  { to: "/questionario", icon: HelpCircle, label: "Questionário" },
  { to: "/plano-aula", icon: ClipboardList, label: "Plano de Aula" },
  { to: "/correcao", icon: Search, label: "Corrigir Trabalho" },
  { to: "/planos", icon: CreditCard, label: "Planos", masterLabel: "Assinaturas" },
];


const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const renderNavItem = (item: { to: string; icon: LucideIcon; label: string; masterLabel?: string }) => {
    const isActive = location.pathname === item.to;
    const displayLabel = isAdmin && item.masterLabel ? item.masterLabel : item.label;

    return (
      <NavLink
        key={item.to}
        to={item.to}
        title={displayLabel}
        className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150"
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute inset-0 rounded-lg bg-sidebar-accent"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}
        <item.icon className="relative z-10 h-5 w-5 flex-shrink-0" />
        {!collapsed && <span className="relative z-10">{displayLabel}</span>}
      </NavLink>
    );
  };

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 bg-sidebar text-sidebar-foreground transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className={`flex items-center flex-shrink-0 ${collapsed ? "p-3 justify-center" : "p-6 justify-between"}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <DokaLogo size={36} />
            {isAdmin && (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-[10px] px-1.5 py-0.5">
                <Crown className="h-3 w-3" />
                Master
              </Badge>
            )}
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground opacity-70 hover:opacity-100"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map(renderNavItem)}
        {isAdmin && renderNavItem({ to: "/admin", icon: ShieldCheck, label: "Painel Admin" })}
      </nav>

      <div className="p-3 border-t border-sidebar-border flex-shrink-0 space-y-1">
        <NavLink
          to="/configuracoes"
          title="Configurações"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium opacity-70 hover:opacity-100 transition-opacity"
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Configurações</span>}
        </NavLink>
        <button
          onClick={handleLogout}
          title="Sair da Conta"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium opacity-70 hover:opacity-100 transition-opacity text-destructive"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Sair da Conta</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
