import React from "react";
import { cn } from "@/lib/utils";

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  gradientFrom?: string;
  gradientTo?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, gradientFrom = "#a955ff", gradientTo = "#ea51ff", icon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "group relative flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 overflow-hidden",
          "bg-card border border-border/50 text-foreground",
          "hover:shadow-lg hover:scale-[1.02] active:scale-[0.97]",
          className
        )}
        {...props}
      >
        {/* Gradient background on hover */}
        <span
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
          }}
        />
        {/* Blur glow */}
        <span
          className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-500 blur-xl rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
          }}
        />

        {/* Icon */}
        {icon && (
          <span className="relative z-10 transition-colors duration-300 group-hover:text-white">
            {icon}
          </span>
        )}

        {/* Label */}
        {children && (
          <span className="relative z-10 transition-colors duration-300 group-hover:text-white">
            {children}
          </span>
        )}
      </button>
    );
  }
);
GradientButton.displayName = "GradientButton";

export { GradientButton };
