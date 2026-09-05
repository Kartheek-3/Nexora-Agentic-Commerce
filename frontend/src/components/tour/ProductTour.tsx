import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Compass, X } from "lucide-react";
import { Button } from "../ui/Button";
import { observeAuthState } from "../../services/auth";

type TourStep = {
  route: string;
  selector?: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right";
};

const TOUR_SEEN_KEY = "nexora_product_tour_seen";

const steps: TourStep[] = [
  { route: "/", selector: '[data-tour="hero-core"]', title: "Welcome to NEXORA", body: "NEXORA turns shopper intent into a controlled, auditable transaction. The commerce core shows Customer, AI Agent, Merchant and Razorpay working as one system.", placement: "left" },
  { route: "/shop", selector: '[data-tour="product-grid"]', title: "Real merchant catalog", body: "Products come from the merchant catalog, including prices, inventory, categories and SKUs.", placement: "top" },
  { route: "/shop", selector: '[data-tour="ask-agent"]', title: "Start with a product", body: "Any product can become context for the Commerce Agent. The tour explains it without adding anything to cart.", placement: "top" },
  { route: "/agent", selector: '[data-tour="customer-intent"]', title: "Natural-language commerce", body: 'Customers can describe what they want in plain language, including category, budget and preferences. Example: "Build me a gaming accessories setup under INR 5,000."', placement: "right" },
  { route: "/agent", selector: '[data-tour="run-agent"]', title: "From language to structured intent", body: "NEXORA converts the request into structured commerce constraints and searches the real merchant catalog. This tour does not run the agent for you.", placement: "right" },
  { route: "/agent", selector: '[data-tour="recommendations"]', title: "Recommendations", body: "After the agent runs, real catalog matches appear here. Empty states stay truthful if no results exist yet.", placement: "left" },
  { route: "/agent", selector: '[data-tour="cross-sell"]', title: "Revenue growth without silent cart changes", body: "The agent can suggest relevant add-ons, but it never adds them silently. The customer must choose to add the recommendation.", placement: "left" },
  { route: "/agent", selector: '[data-tour="authorization"]', title: "Humans control the money", body: "The agent can prepare a purchase, but explicit customer authorization is required before payment.", placement: "left" },
  { route: "/checkout", selector: '[data-tour="checkout-authorization"]', title: "Razorpay handles payment", body: "After authorization, the backend creates a Razorpay Test order. Payment success is accepted only after server-side signature verification.", placement: "top" },
  { route: "/merchant", selector: '[data-tour="merchant-dashboard"]', title: "Merchant Command Center", body: "Merchants see agent sessions, verified transactions and commerce activity from persisted backend data.", placement: "bottom" },
  { route: "/merchant", selector: '[data-tour="live-activity"]', title: "Every action is observable", body: "Backend actions are persisted to audit logs first, then streamed live to the dashboard through SSE. Empty states stay truthful.", placement: "left" },
  { route: "/merchant", selector: '[data-tour="guardrails-link"]', title: "Bounded AI", body: "Merchant rules control what the agent may propose and whether a purchase can continue.", placement: "left" },
  { route: "/architecture", selector: '[data-tour="architecture-map"]', title: "Reasoning is separated from money movement", body: "AI handles intent, search and recommendation. Trusted backend systems handle identity, pricing, authorization and payment verification.", placement: "top" },
  { route: "/merchant/catalog-readiness", selector: '[data-tour="ai-buyer-gateway"]', title: "AI-to-merchant commerce", body: "External AI agents can search, build carts and request checkout, but final money movement remains human-gated.", placement: "top" },
  { route: "/agent", title: "You're ready to explore NEXORA", body: "Intent -> Catalog -> Recommendation -> Guardrails -> Human approval -> Razorpay -> Verification -> Audit.", placement: "bottom" },
];

function waitForElement(selector?: string, timeout = 900) {
  if (!selector) return Promise.resolve<HTMLElement | null>(null);
  const started = performance.now();
  return new Promise<HTMLElement | null>((resolve) => {
    const tick = () => {
      const element = document.querySelector<HTMLElement>(selector);
      if (element) {
        resolve(element);
        return;
      }
      if (performance.now() - started > timeout) {
        console.warn("[tour] selector unavailable", selector);
        resolve(null);
        return;
      }
      window.requestAnimationFrame(tick);
    };
    tick();
  });
}

function tooltipPosition(rect: DOMRect | null, placement: TourStep["placement"]) {
  const width = Math.min(360, window.innerWidth - 32);
  const margin = 16;
  if (!rect) {
    return { left: Math.max(margin, (window.innerWidth - width) / 2), top: Math.max(margin, window.innerHeight - 320), width };
  }
  const positions = {
    bottom: { left: rect.left + rect.width / 2 - width / 2, top: rect.bottom + 16 },
    top: { left: rect.left + rect.width / 2 - width / 2, top: rect.top - 250 },
    left: { left: rect.left - width - 16, top: rect.top + rect.height / 2 - 120 },
    right: { left: rect.right + 16, top: rect.top + rect.height / 2 - 120 },
  };
  const preferred = positions[placement ?? "bottom"];
  return {
    width,
    left: Math.min(Math.max(margin, preferred.left), window.innerWidth - width - margin),
    top: Math.min(Math.max(margin, preferred.top), window.innerHeight - 280),
  };
}

export function ProductTour() {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const step = steps[index];

  const startTour = useCallback(() => {
    setWelcome(false);
    setIndex(0);
    setActive(true);
    localStorage.setItem(TOUR_SEEN_KEY, "true");
  }, []);

  const closeTour = useCallback(() => {
    setActive(false);
    setWelcome(false);
    localStorage.setItem(TOUR_SEEN_KEY, "true");
  }, []);

  useEffect(() => {
    return observeAuthState((user) => {
      if (user && localStorage.getItem(TOUR_SEEN_KEY) !== "true") setWelcome(true);
    });
  }, []);

  useEffect(() => {
    const handler = () => startTour();
    window.addEventListener("nexora:start-tour", handler);
    return () => window.removeEventListener("nexora:start-tour", handler);
  }, [startTour]);

  useEffect(() => {
    if (!active || !step) return;
    navigate(step.route);
    let cancelled = false;
    const syncTarget = async () => {
      const element = await waitForElement(step.selector);
      if (cancelled) return;
      if (element) {
        element.scrollIntoView({ block: "center", inline: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
        window.setTimeout(() => !cancelled && setTargetRect(element.getBoundingClientRect()), 180);
      } else {
        setTargetRect(null);
      }
    };
    window.setTimeout(syncTarget, 120);
    return () => {
      cancelled = true;
    };
  }, [active, navigate, step]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "Escape") closeTour();
      if (event.key === "ArrowRight") setIndex((value) => Math.min(value + 1, steps.length - 1));
      if (event.key === "ArrowLeft") setIndex((value) => Math.max(value - 1, 0));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, closeTour]);

  useEffect(() => {
    if (!active) return;
    const onResize = () => {
      const element = step.selector ? document.querySelector<HTMLElement>(step.selector) : null;
      setTargetRect(element?.getBoundingClientRect() ?? null);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [active, step]);

  const position = useMemo(() => tooltipPosition(targetRect, step?.placement), [targetRect, step]);

  if (welcome) {
    return (
      <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 px-4">
        <div className="max-w-md rounded-lg border border-white/12 bg-ink/90 p-5 shadow-[0_24px_100px_rgba(0,0,0,0.55),0_0_70px_rgba(124,108,255,0.18)] backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Welcome to NEXORA</p>
          <h2 className="mt-3 text-2xl font-semibold text-ivory">New to NEXORA?</h2>
          <p className="mt-3 text-sm leading-6 text-ivory/[0.64]">Take a 90-second tour of the agentic commerce flow.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button icon={<Compass size={16} />} onClick={startTour}>Start Product Tour</Button>
            <Button variant="secondary" onClick={closeTour}>Explore myself</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!active || !step) return null;

  const finalStep = index === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none">
        <div className="absolute inset-0 bg-black/65" />
      {targetRect ? (
        <div
          className="absolute rounded-xl border border-gold/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.28),0_0_44px_rgba(124,108,255,0.36)]"
          style={{ left: targetRect.left - 8, top: targetRect.top - 8, width: targetRect.width + 16, height: targetRect.height + 16 }}
        />
      ) : null}
      <section className="tour-card pointer-events-auto absolute rounded-lg border border-white/12 bg-ink/92 p-4 text-ivory shadow-[0_24px_90px_rgba(0,0,0,0.56),0_0_50px_rgba(72,224,255,0.1)] backdrop-blur-xl" style={position}>
        <div className="flex items-start justify-between gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Step {index + 1} / {steps.length}</span>
          <button className="rounded-md p-1 text-ivory/50 transition hover:bg-white/10 hover:text-ivory" aria-label="Skip tour" onClick={closeTour}>
            <X size={16} />
          </button>
        </div>
        <h2 className="mt-3 text-xl font-semibold">{step.title}</h2>
        <p className="mt-3 text-sm leading-6 text-ivory/[0.66]">{step.body}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button className="text-sm text-ivory/50 transition hover:text-ivory" onClick={closeTour}>Skip tour</button>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={index === 0} icon={<ArrowLeft size={15} />} onClick={() => setIndex((value) => Math.max(value - 1, 0))}>Back</Button>
            {finalStep ? (
              <>
                <Button variant="secondary" onClick={() => navigate("/merchant")}>Open Merchant Dashboard</Button>
                <Button icon={<ArrowRight size={15} />} onClick={() => { closeTour(); navigate("/agent"); }}>Launch Agent</Button>
              </>
            ) : (
              <Button icon={<ArrowRight size={15} />} onClick={() => setIndex((value) => Math.min(value + 1, steps.length - 1))}>Next</Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
