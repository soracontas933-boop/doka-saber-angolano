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
    <nav className="md:hidden fixed bottom-6 left-6 right-6 z-50 rounded-[32px] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between relative">
        {visibleItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          
          if (item.to === "/home") {
             return (
               <NavLink
                key={item.to}
                to={item.to}
                className="relative z-10 flex flex-col items-center gap-1 transition-all duration-300 active:scale-90"
              >
                <item.icon className={`h-6 w-6 ${isActive ? "text-white" : "text-white/40"}`} />
                <span className={`text-[10px] font-medium ${isActive ? "text-white" : "text-white/40"}`}>Início</span>
              </NavLink>
             );
          }

          if (item.label === "Ajustes") {
             return (
               <NavLink
                key={item.to}
                to={item.to}
                className="relative z-10 flex flex-col items-center gap-1 transition-all duration-300 active:scale-90"
              >
                <item.icon className={`h-6 w-6 ${isActive ? "text-white" : "text-white/40"}`} />
                <span className={`text-[10px] font-medium ${isActive ? "text-white" : "text-white/40"}`}>Perfil</span>
              </NavLink>
             );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative z-10 flex flex-col items-center gap-1 transition-all duration-300 active:scale-90"
            >
              <item.icon className={`h-6 w-6 ${isActive ? "text-white" : "text-white/40"}`} />
              <span className={`text-[10px] font-medium ${isActive ? "text-white" : "text-white/40"}`}>{item.label}</span>
            </NavLink>
          );
        })}
        
        {/* Central Add Button Style Placeholder */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-[2px] shadow-lg shadow-blue-500/20">
           <div className="w-full h-full rounded-full bg-[#0B0B0F] flex items-center justify-center">
              <div className="w-6 h-6 relative">
                 <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white rounded-full" />
                 <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white rounded-full" />
              </div>
           </div>
        </div>
      </div>
    </nav>
  );
};

export default MobileNav;
