import type { ReactNode } from "react";
import { NexoraSurface } from "../ui/NexoraSurface";

export function AuthCard({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <NexoraSurface
      intensity="raised"
      className="auth-card mx-auto w-full max-w-md p-5 sm:p-7"
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.42, ease: "easeOut" }}
    >
      <p className="nx-kicker">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ivory">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-ivory/[0.58]">{subtitle}</p>
      {children}
    </NexoraSurface>
  );
}
