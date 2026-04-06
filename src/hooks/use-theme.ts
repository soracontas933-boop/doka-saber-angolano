import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      try {
        return (localStorage.getItem("delle-theme") as Theme) || "light";
      } catch (e) {
        console.warn("Erro ao aceder ao localStorage:", e);
        return "light";
      }
    }
    return "light";
  });

  useEffect(() => {
    try {
      const root = document.documentElement;
      if (theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("delle-theme", theme);
      }
    } catch (e) {
      console.warn("Erro ao aplicar tema ou guardar no localStorage:", e);
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return { theme, setTheme, toggleTheme };
};
