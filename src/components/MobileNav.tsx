import { NavLink, useLocation } from "react-router-dom";
import { Home, FolderOpen, Library, Presentation, Settings, LayoutDashboard, Receipt, ShieldCheck, Key, MessageSquare, CreditCard } from "lucide-react";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { useAdmin } from "@/hooks/use-admin";

const navItems = [
  { to: "/home", icon: Home, label: "Início", featureKey: "home", userOnly: true },
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", adminOnly: true, permission: "dashboard" },
  { to: "/faturamento", icon: Receipt, label: "Faturamento", adminOnly: true, permission: "faturamento" },
  { to: "/admin", icon: ShieldCheck, label: "Admin", adminOnly: true, permission: "admin_panel" },
  { to: "/setup-api-keys", icon: Key, label: "Chaves", adminOnly: true, permission: "admin_panel" },
  { to: "/mensagens", icon: MessageSquare, label: "Mensagens", adminOnly: true, permission: "mensagens" },
  { to: "/planos", icon: CreditCard, label: "Assinaturas", featureKey: "planos" },
];

interface NavItem {
  to: string;
  icon: any;
  label: string;
  featureKey?: string;
  adminOnly?: boolean;
  userOnly?: boolean;
  permission?: string;
}

const MobileNav = () => {
  const location = useLocation();
  const { isFeatureEnabled } = useFeatureFlags();
  const { isAdmin, hasPermission } = useAdmin();

  const visibleItems = navItems.filter((item: NavItem) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.userOnly && isAdmin) return false;
    if (item.adminOnly && item.permission && !hasPermission(item.permission)) return false;
    if (!isAdmin && item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
    return true;
  });

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom bg-background/80 backdrop-blur-xl border-t border-border/40">
      <div className="px-2 py-3 flex-row flex items-center justify-between overflow-x-auto scrollbar-none pt-px pb-[4px]">
        {visibleItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center gap-1.5 px-1.5 py-1 transition-all duration-200 active:scale-90 flex-shrink-0"
            >
              <div className={`p-1 rounded-full transition-all duration-300 ${isActive ? 'bg-primary/10' : 'bg-transparent'}`}>
                <item.icon
                  className={`h-5 w-5 transition-all duration-300 ${
                    isActive ? "text-primary stroke-[2.5px]" : "text-muted-foreground stroke-[1.5px] shadow-glass"
                  }`}
                />
              </div>
              <span
                className={`text-[9px] font-medium transition-colors duration-300 whitespace-nowrap ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
