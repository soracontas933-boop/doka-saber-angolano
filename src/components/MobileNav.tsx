import { NavLink, useLocation } from "react-router-dom";
import { Home, FolderOpen, WrapText, Presentation, Settings } from "lucide-react";

const navItems = [
  { to: "/home", icon: Home, label: "Início" },
  { to: "/meus-projetos", icon: FolderOpen, label: "Projetos" },
  { to: "/trabalho", icon: WrapText, label: "Trabalho" },
  { to: "/apresentacao", icon: Presentation, label: "Slides" },
  { to: "/configuracoes", icon: Settings, label: "Config." },
];

const MobileNav = () => {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom bg-background border-t border-border">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.to ||
            (item.to === "/home" && location.pathname === "/home") ||
            (item.to === "/configuracoes" && location.pathname === "/configuracoes");
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all duration-150"
            >
              {isActive && (
                <div className="absolute -top-0.5 w-5 h-0.5 rounded-full bg-primary" />
              )}
              <item.icon
                className={`h-5 w-5 transition-colors duration-150 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-normal transition-colors duration-150 ${
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
