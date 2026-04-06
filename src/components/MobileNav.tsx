import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  FolderOpen,
  FileText,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/home", icon: Home, label: "Início" },
  { to: "/meus-projetos", icon: FolderOpen, label: "Projetos" },
  { to: "/trabalho", icon: FileText, label: "Trabalho" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
];

const MobileNav = () => {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="mx-3 mb-2 rounded-2xl bg-black/90 backdrop-blur-xl border border-white/10 px-2 py-2 flex items-center justify-around shadow-[0_-4px_30px_rgba(0,0,0,0.3)]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to === "/home" && location.pathname === "/home") ||
            (item.to === "/configuracoes" && location.pathname === "/configuracoes");
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors"
            >
              <item.icon
                className={`h-5 w-5 transition-colors ${
                  isActive
                    ? "text-[hsl(var(--delle-nav-active))]"
                    : "text-[hsl(var(--delle-nav-inactive))]"
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive
                    ? "text-[hsl(var(--delle-nav-active))]"
                    : "text-[hsl(var(--delle-nav-inactive))]"
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
