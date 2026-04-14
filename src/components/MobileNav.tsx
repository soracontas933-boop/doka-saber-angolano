import { NavLink, useLocation } from "react-router-dom";
import { Home, FolderOpen, WrapText, Presentation, Settings } from "lucide-react";
import { motion } from "framer-motion";

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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom bg-black border-black border-4">
      <div className="mx-3 mb-2 px-2 py-2 flex items-center justify-around rounded-2xl border-border/50 shadow-xl bg-zinc-900 border-0">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.to ||
            (item.to === "/home" && location.pathname === "/home") ||
            (item.to === "/configuracoes" && location.pathname === "/configuracoes");
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all shadow-lg"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active-indicator"
                  className="absolute -top-1 w-5 h-1 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon
                className={`h-5 w-5 transition-colors duration-200 ${
                  isActive ? "text-primary-foreground" : "text-primary-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? "text-primary-foreground" : "text-primary-foreground"
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
