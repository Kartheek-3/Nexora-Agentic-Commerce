import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  icon?: ReactNode;
  loading?: boolean;
};

export function Button({ className, variant = "primary", icon, loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] transition duration-200 hover:-translate-y-0.5 active:translate-y-0",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
        "active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-gold text-white shadow-[0_18px_48px_rgba(109,93,251,0.28)] hover:bg-ember hover:text-white",
        variant === "secondary" && "border border-line bg-white/[0.08] text-ivory hover:border-gold/40 hover:bg-white/[0.12] hover:shadow-[0_18px_54px_rgba(109,93,251,0.12)]",
        variant === "ghost" && "text-ivory/[0.78] hover:bg-white/[0.08] hover:text-ivory",
        variant === "outline" && "border border-gold/35 bg-transparent text-ember hover:bg-gold/10",
        variant === "danger" && "border border-danger/40 bg-danger/[0.12] text-red-100 hover:bg-danger/[0.18]",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
