import { NavLink, useLocation } from "react-router-dom";
import { Home, FolderOpen, Library, Presentation, Settings } from "lucide-react";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { useAdmin } from "@/hooks/use-admin";

const navItems = [
  { to: "/home", icon: Home, label: "Início", featureKey: "home" },
  { to: "/meus-projetos", icon: FolderOpen, label: "Projetos", featureKey: "meus-projetos" },
  { to: "/livraria", icon: Library, label: "Livraria", featureKey: "livraria" },
  { to: "/apresentacao", icon: Presentation, label: "Slides", featureKey: "apresentacao" },
  { to: "/configuracoes", icon: Settings, label: "Ajustes" },
];

const MobileNav = () => {
  const location = useLocation();
  const { isFeatureEnabled } = useFeatureFlags();
  const { isAdmin } = useAdmin();

  const visibleItems = navItems.filter((item) => {
    if (!item.featureKey) return true;
    if (isAdmin) return true;
    return isFeatureEnabled(item.featureKey);
  });

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom bg-background/80 backdrop-blur-xl border-t border-border/40">
      <div className="px-4 py-3 flex-row pt-px pb-[4px] flex items-start justify-center text-justify font-mono">
        {visibleItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center gap-1.5 px-2 py-1 transition-all duration-200 active:scale-90 mr-[6px]"
            >
              <div className={`p-1 rounded-full transition-all duration-300 ${isActive ? 'bg-primary/10' : 'bg-transparent'}`}>
                <item.icon
                  className={`h-5.5 w-5.5 transition-all duration-300 ${
                    isActive ? "text-primary stroke-[2.5px]" : "text-muted-foreground stroke-[1.5px] shadow-glass"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-medium transition-colors duration-300 ${
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
