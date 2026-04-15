import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Key,
  FileText,
  BookOpen,
  HelpCircle,
  ClipboardList,
  Search,
  LayoutDashboard,
  Receipt,
  Settings,
  FolderOpen,
  LogOut,
  CreditCard,
  PanelLeftClose,
  ShieldCheck,
  Crown,
  LifeBuoy,
  MessageSquare,
  Home,
  Users,
  Presentation,
  type LucideIcon,
  ChartSpline,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
import { Badge } from "@/components/ui/badge";
import DelleLogo from "./DelleLogo";
import { useState } from "react";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  masterLabel?: string;
  adminOnly?: boolean;
  userOnly?: boolean;
  permission?: string;
}

const navItems: NavItem[] = [
  { to: "/home", icon: Home, label: "Início", userOnly: true },
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", adminOnly: true, permission: "dashboard" },
  { to: "/faturamento", icon: Receipt, label: "Faturamento", adminOnly: true, permission: "faturamento" },
  { to: "/admin", icon: ShieldCheck, label: "Painel Admin", adminOnly: true, permission: "admin_panel" },
  { to: "/meus-projetos", icon: FolderOpen, label: "Meus Projetos" },
  { to: "/trabalho", icon: FileText, label: "Trabalho Escolar" },
  { to: "/curriculo", icon: FileText, label: "Currículo (CV)" },
  { to: "/resumo", icon: BookOpen, label: "Resumo" },
  { to: "/questionario", icon: HelpCircle, label: "Questionário" },
  { to: "/plano-aula", icon: ClipboardList, label: "Plano de Aula" },
  { to: "/apresentacao", icon: Presentation, label: "Apresentação" },
  { to: "/correcao", icon: Search, label: "Corrigir Trabalho" },
  { to: "/grupos", icon: Users, label: "Trabalho em Grupo", userOnly: true },
  { to: "/planos", icon: CreditCard, label: "Planos", masterLabel: "Assinaturas" },
  { to: "/suporte", icon: LifeBuoy, label: "Suporte & Ajuda", userOnly: true },
  { to: "/mensagens", icon: MessageSquare, label: "Mensagens", adminOnly: true, permission: "mensagens" },
  { to: "/setup-api-keys", icon: Key, label: "Chaves API", adminOnly: true, permission: "admin_panel" },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = useAdmin();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const renderNavItem = (item: NavItem) => {
    if (item.adminOnly && !isAdmin) return null;
    if (item.userOnly && isAdmin) return null;
    if (item.adminOnly && item.permission && !hasPermission(item.permission)) return null;

    const isActive = location.pathname === item.to;
    const displayLabel = isAdmin && item.masterLabel ? item.masterLabel : item.label;

    return (
      <NavLink
        key={item.to}
        to={item.to}
        title={displayLabel}
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-normal transition-all duration-150 ${
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span>{displayLabel}</span>}
      </NavLink>
    );
  };

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 bg-background border-r border-border transition-all duration-150 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="p-3">
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-2">
            <DelleLogo size={36} />
            {isAdmin && (
              <Badge className="bg-muted text-muted-foreground border border-border gap-1 text-[10px] px-1.5 py-0.5">
                <Crown className="h-3 w-3" />
                Master
              </Badge>
            )}
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-muted transition-all duration-150 text-muted-foreground hover:text-foreground"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChartSpline className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(renderNavItem)}
      </nav>

      <div className="p-3 border-t border-border flex-shrink-0 space-y-0.5">
        <NavLink
          to="/configuracoes"
          title="Configurações"
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-normal text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Configurações</span>}
        </NavLink>
        <button
          onClick={handleLogout}
          title="Sair da Conta"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-normal text-muted-foreground hover:bg-muted hover:text-destructive transition-all duration-150"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Sair da Conta</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
