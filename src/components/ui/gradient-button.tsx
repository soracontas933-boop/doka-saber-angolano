import React from "react";
import { cn } from "@/lib/utils";

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, icon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-normal transition-all duration-150",
          "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97]",
          className
        )}
        {...props}
      >
        {icon && <span>{icon}</span>}
        {children && <span>{children}</span>}
      </button>
    );
  }
);
GradientButton.displayName = "GradientButton";

export { GradientButton };
