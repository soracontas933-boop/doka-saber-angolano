import { NavLink, useLocation } from "react-router-dom";
import { Home, FolderOpen, Library, Presentation, Settings, WandSparkles, ShieldCheck, type LucideIcon } from "lucide-react";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { useAdmin } from "@/hooks/use-admin";

interface MobileNavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  featureKey?: string;
  adminOnly?: boolean;
  permission?: string;
}

const navItems: MobileNavItem[] = [
  { to: "/home", icon: Home, label: "Início", featureKey: "home" },
  { to: "/meus-projetos", icon: FolderOpen, label: "Projetos", featureKey: "meus-projetos" },
  { to: "/gerador-media", icon: WandSparkles, label: "Criar", featureKey: "gerador-media" },
  { to: "/admin", icon: ShieldCheck, label: "Master", adminOnly: true, permission: "admin_panel" },
  { to: "/livraria", icon: Library, label: "Livraria", featureKey: "livraria" },
  { to: "/apresentacao", icon: Presentation, label: "Slides", featureKey: "apresentacao" },
  { to: "/configuracoes", icon: Settings, label: "Ajustes" },
];

const MobileNav = () => {
  const location = useLocation();
  const { isFeatureEnabled } = useFeatureFlags();
  const { isAdmin, hasPermission } = useAdmin();

  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly && (!isAdmin || (item.permission && !hasPermission(item.permission)))) return false;
    if (!item.featureKey) return true;
    if (isAdmin) return true;
    return isFeatureEnabled(item.featureKey);
  });

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom bg-gradient-to-t from-background to-background/95 backdrop-blur-xl border-t border-border/40 shadow-2xl shadow-black/20 dark:shadow-black/50">
      <div className={`w-full px-2 py-3 pt-px pb-[4px] grid items-start text-center font-mono ${visibleItems.length > 5 ? "grid-cols-6" : "grid-cols-5"}`}>
        {visibleItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex min-w-0 flex-col items-center gap-1.5 px-1 py-1 transition-all duration-200 active:scale-90"
            >
              <div className={`p-1 rounded-full transition-all duration-300 button-3d ${
                isActive 
                  ? 'bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg shadow-primary/30' 
                  : 'bg-transparent hover:bg-secondary/50'
              }`}>
                <item.icon
                  className={`h-5.5 w-5.5 transition-all duration-300 ${
                    isActive ? "text-primary stroke-[2.5px]" : "text-muted-foreground stroke-[1.5px] shadow-glass"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-medium transition-colors duration-300 ${
                  isActive ? "text-primary font-semibold" : "text-muted-foreground"
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
