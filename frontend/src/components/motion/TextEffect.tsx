import type { ReactNode } from "react";
import { motion } from "motion/react";

export function TextEffect({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.span>
  );
}
