import { useState } from "react";
import { Bot, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Metric } from "../components/ui/Metric";
import { NexoraSurface } from "../components/ui/NexoraSurface";
import { products } from "../data/demo";

export default function CatalogReadiness() {
  const [open, setOpen] = useState(false);
  const [gatewayOpen, setGatewayOpen] = useState(false);
  const sample = products[0];
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <p className="text-xs uppercase tracking-[0.24em] text-gold">Agent Commerce Readiness</p>
      <h1 className="mt-2 text-4xl font-semibold">Can an AI buyer transact here?</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-5">
        <Metric label="Catalog Readability" value="98%" />
        <Metric label="AI Discoverability" value="94%" />
        <Metric label="Inventory Access" value="100%" />
        <Metric label="Checkout Compatibility" value="100%" />
        <Metric label="Schema Coverage" value="97%" />
      </div>
      <Button className="mt-8" icon={<Bot size={16} />} onClick={() => setOpen((value) => !value)}>View As AI Agent</Button>
      {open ? (
        <NexoraSurface className="mt-6 p-5">
          <pre className="overflow-auto rounded-md border border-line bg-black/40 p-4 text-sm leading-6 text-ivory/70">{JSON.stringify({
            product_id: sample.id,
            name: sample.name,
            description: sample.description,
            category: sample.category.toLowerCase(),
            price: sample.price,
            currency: "INR",
            inventory: sample.inventory,
            attributes: sample.attributes,
            intent_matches: ["gift under 4000", "minimal jewellery", "birthday gift"],
            availability: true,
            agent_capabilities: { can_recommend: true, can_add_to_cart: true, can_purchase: true, requires_purchase_authorization: true },
            checkout_endpoint: "/api/agent/checkout",
          }, null, 2)}</pre>
        </NexoraSurface>
      ) : null}
      <NexoraSurface data-tour="ai-buyer-gateway" intensity="raised" className="mt-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">External AI Buyer Gateway</p>
            <h2 className="mt-2 text-2xl font-semibold">Test as an agent client</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ivory/60">Sample prompt: I need a birthday gift under INR 4,000 for someone who likes minimal jewellery.</p>
          </div>
          <Button variant="secondary" icon={<Bot size={16} />} onClick={() => setGatewayOpen((value) => !value)}>Run Gateway Trace</Button>
        </div>
        {gatewayOpen ? (
          <div className="mt-5 grid gap-3 md:grid-cols-6">
            {["Manifest", "Catalog", "Search", "Cart", "Quote", "Checkout Request"].map((step) => (
              <div key={step} className="rounded-md border border-line bg-black/25 p-3">
                <CheckCircle2 size={18} className="text-gold" />
                <p className="mt-3 text-sm font-semibold">{step}</p>
                <p className="mt-1 text-xs text-ivory/50">Human authorization required</p>
              </div>
            ))}
          </div>
        ) : null}
      </NexoraSurface>
    </div>
  );
}
