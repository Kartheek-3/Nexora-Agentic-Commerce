import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "../../lib/utils";

type NexoraSurfaceProps = HTMLMotionProps<"div"> & {
  children?: ReactNode;
  intensity?: "quiet" | "raised" | "command";
};

export function NexoraSurface({
  children,
  className,
  intensity = "quiet",
  ...props
}: NexoraSurfaceProps) {
  return (
    <motion.div
      className={cn(
        "nx-surface nx-shell-glow",
        intensity === "raised" && "nx-surface-raised",
        intensity === "command" && "nx-surface-command",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function NexoraBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-ember shadow-[0_0_28px_rgba(109,93,251,0.12),inset_0_1px_0_rgba(255,255,255,0.12)]", className)}>
      {children}
    </span>
  );
}
