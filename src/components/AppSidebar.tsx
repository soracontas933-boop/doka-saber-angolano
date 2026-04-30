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
  Library,
  Zap,
  type LucideIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
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
  featureKey?: string;
}

const navItems: NavItem[] = [
  { to: "/home", icon: Home, label: "Início", userOnly: true, featureKey: "home" },
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", adminOnly: true, permission: "dashboard" },
  { to: "/faturamento", icon: Receipt, label: "Faturamento", adminOnly: true, permission: "faturamento" },
  { to: "/admin", icon: ShieldCheck, label: "Painel Admin", adminOnly: true, permission: "admin_panel" },
  { to: "/meus-projetos", icon: FolderOpen, label: "Meus Projetos", featureKey: "meus-projetos" },
  { to: "/trabalho", icon: FileText, label: "Trabalho Escolar", featureKey: "trabalho" },
  { to: "/curriculo", icon: FileText, label: "Currículo (CV)", featureKey: "curriculo" },
  { to: "/resumo", icon: BookOpen, label: "Resumo", featureKey: "resumo" },
  { to: "/questionario", icon: HelpCircle, label: "Questionário", featureKey: "questionario" },
  { to: "/plano-aula", icon: ClipboardList, label: "Plano de Aula", featureKey: "plano-aula" },
  { to: "/apresentacao", icon: Presentation, label: "Apresentação", featureKey: "apresentacao" },
  { to: "/correcao", icon: Search, label: "Corrigir Trabalho", featureKey: "correcao" },
  { to: "/grupos", icon: Users, label: "Trabalho em Grupo", userOnly: true, featureKey: "grupos" },
  { to: "/livraria", icon: Library, label: "Livraria", masterLabel: "Livraria", featureKey: "livraria" },
  { to: "/planos", icon: CreditCard, label: "Planos", masterLabel: "Assinaturas", featureKey: "planos" },
  { to: "/creditos", icon: Zap, label: "Créditos Extras", userOnly: true, featureKey: "creditos" },
  { to: "/suporte", icon: LifeBuoy, label: "Suporte & Ajuda", userOnly: true, featureKey: "suporte" },
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

    const isActive = location.pathname.startsWith(item.to);
    const displayLabel = isAdmin && item.masterLabel ? item.masterLabel : item.label;

    return (
      <NavLink
        key={item.to}
        to={item.to}
        title={displayLabel}
        className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground shadow-apple-card-hover"
        }`}
      >
        <item.icon className={`h-4.5 w-4.5 flex-shrink-0 transition-colors ${isActive ? 'text-primary stroke-[2.5px]' : 'group-hover:text-foreground'}`} />
        {!collapsed && <span className="truncate text-black opacity-80">{displayLabel}</span>}
        {isActive && !collapsed && (
          <div className="absolute right-2 w-1 h-4 bg-primary rounded-full" />
        )}
      </NavLink>
    );
  };

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 bg-background border-r border-border/40 transition-all duration-300 ease-in-out ${
        collapsed ? "w-[72px]" : "w-64"
      }`}
    >
      <div className="p-4 flex items-center justify-between h-16">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 animate-in fade-in duration-300">
            <DelleLogo size={32} />
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight">​</span>
              {isAdmin && (
                <Badge variant="secondary" className="h-4 text-[9px] px-1 font-bold bg-primary/10 text-primary border-none">
                  MASTER
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="mx-auto">
            <DelleLogo size={28} />
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-none">
        {navItems.map(renderNavItem)}
      </nav>

      <div className="p-3 border-t border-border/40 space-y-1">
        <NavLink
          to="/configuracoes"
          title="Configurações"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
            location.pathname.startsWith("/configuracoes")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <Settings className="h-4.5 w-4.5 flex-shrink-0" />
          {!collapsed && <span>Ajustes</span>}
        </NavLink>
        
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="h-4.5 w-4.5" /> : <ChevronLeft className="h-4.5 w-4.5" />}
          {!collapsed && <span>Recolher</span>}
        </button>

        <button
          onClick={handleLogout}
          title="Sair da Conta"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all duration-200"
        >
          <LogOut className="h-4.5 w-4.5 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
