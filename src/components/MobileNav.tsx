import { NavLink, useLocation } from "react-router-dom";
import { Home, FolderOpen, FileText, Settings } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { to: "/home", icon: Home, label: "Início" },
  { to: "/meus-projetos", icon: FolderOpen, label: "Projetos" },
  { to: "/trabalho", icon: FileText, label: "Trabalho" },
  { to: "/configuracoes", icon: Settings, label: "Config." },
];

const MobileNav = () => {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom bg-black">
      {/* Water drop SVG filter */}
      <svg className="absolute" width="0" height="0">
        <defs>
          <filter id="water-drop">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="drop"
            />
            <feComposite in="SourceGraphic" in2="drop" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div
        className="mx-3 mb-2 px-2 py-2 flex items-center justify-around bg-zinc-950 rounded-full border-2 shadow-xl border-primary"
        style={{
          background: "hsl(var(--delle-nav-bg))",
          borderRadius: "22px",
          filter: "url(#water-drop)",
          boxShadow:
            "0 -4px 20px rgba(0,0,0,0.35), 0 2px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
          backdropFilter: "blur(12px)",
        }}
      >
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.to ||
            (item.to === "/home" && location.pathname === "/home") ||
            (item.to === "/configuracoes" &&
              location.pathname === "/configuracoes");
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${isActive ? "bg-sidebar" : ""}`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active-indicator"
                  className="absolute -top-1 w-5 h-1 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon
                className={`h-5 w-5 transition-colors duration-200 border-0 border-gray-100/[0.01] shadow-xl text-secondary ${
                  isActive
                    ? "text-[hsl(var(--delle-nav-active))]"
                    : "text-[hsl(var(--delle-nav-inactive))]"
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors duration-200 ${
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
