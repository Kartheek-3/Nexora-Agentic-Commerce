import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { CommerceCore } from "./CommerceCore";

type GlobalCorePreset = {
  opacity: number;
  labels: boolean;
  size: string;
};

const presets: Record<string, GlobalCorePreset> = {
  "/shop": { opacity: 0.16, labels: false, size: "h-[34rem] w-[34rem]" },
  "/agent": { opacity: 0.34, labels: true, size: "h-[32rem] w-[32rem]" },
  "/merchant": { opacity: 0.1, labels: false, size: "h-[34rem] w-[34rem]" },
  "/merchant/guardrails": { opacity: 0.12, labels: false, size: "h-[33rem] w-[33rem]" },
  "/merchant/audit": { opacity: 0.12, labels: false, size: "h-[33rem] w-[33rem]" },
  "/merchant/campaigns": { opacity: 0.1, labels: false, size: "h-[32rem] w-[32rem]" },
  "/merchant/catalog-readiness": { opacity: 0.13, labels: false, size: "h-[33rem] w-[33rem]" },
  "/architecture": { opacity: 0.18, labels: false, size: "h-[35rem] w-[35rem]" },
  "/cart": { opacity: 0.12, labels: false, size: "h-[32rem] w-[32rem]" },
  "/checkout": { opacity: 0.07, labels: false, size: "h-[30rem] w-[30rem]" },
};

function presetForPath(pathname: string): GlobalCorePreset | null {
  if (pathname === "/" || pathname === "/login" || pathname === "/register" || pathname.startsWith("/payment/")) return null;
  if (pathname.startsWith("/product/")) return { opacity: 0.14, labels: false, size: "h-[33rem] w-[33rem]" };
  if (pathname.startsWith("/merchant/products")) return presets["/shop"];
  if (pathname.startsWith("/merchant/orders") || pathname.startsWith("/merchant/revenue")) return presets["/merchant"];
  if (pathname.startsWith("/merchant/agent")) return presets["/agent"];
  return presets[pathname] ?? { opacity: 0.12, labels: false, size: "h-[32rem] w-[32rem]" };
}

export function GlobalCommerceCore() {
  const { pathname } = useLocation();
  const preset = useMemo(() => presetForPath(pathname), [pathname]);

  if (!preset) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed left-1/2 top-1/2 z-0 hidden -translate-x-1/2 -translate-y-1/2 overflow-visible md:block ${preset.size}`}
      style={{ opacity: preset.opacity }}
    >
      <CommerceCore compact variant="ambient" showLabels={preset.labels} className="h-full" />
      <div className="absolute inset-[-18%] bg-radial-fade" />
    </div>
  );
}
