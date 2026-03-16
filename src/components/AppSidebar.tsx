import { NavLink, useLocation } from "react-router-dom";
import { FileText, BookOpen, HelpCircle, ClipboardList, LayoutDashboard, Settings, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import DokaLogo from "./DokaLogo";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Painel" },
  { to: "/trabalho", icon: FileText, label: "Trabalho Escolar" },
  { to: "/resumo", icon: BookOpen, label: "Resumo" },
  { to: "/questionario", icon: HelpCircle, label: "Questionário" },
  { to: "/plano-aula", icon: ClipboardList, label: "Plano de Aula" },
];

const AppSidebar = () => {
  const location = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-sidebar text-sidebar-foreground">
      <div className="p-6">
        <DokaLogo size={36} />
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150"
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-sidebar-accent"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon className="relative z-10 h-5 w-5" />
              <span className="relative z-10">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <NavLink
          to="/configuracoes"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium opacity-70 hover:opacity-100 transition-opacity"
        >
          <Settings className="h-5 w-5" />
          <span>Configurações</span>
        </NavLink>
      </div>
    </aside>
  );
};

export default AppSidebar;
