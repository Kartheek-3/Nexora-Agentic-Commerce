import { Bot, Check, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import type { Product } from "../../types/commerce";
import { productToIntentContext } from "../../lib/productIntent";
import { formatINR } from "../../lib/utils";
import { Button } from "../ui/Button";
import { NexoraSurface } from "../ui/NexoraSurface";

export function ProductCard({ product, onSelect }: { product: Product; onSelect: (product: Product) => void }) {
  const navigate = useNavigate();
  return (
    <NexoraSurface intensity="raised" className="group">
      <motion.article layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      <div className="relative overflow-hidden">
        <img src={product.image} alt={product.name} className="h-44 w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
        <div className="absolute bottom-3 left-3 rounded-full border border-gold/30 bg-black/70 px-2 py-1 text-xs font-semibold text-ember">{product.matchScore}% MATCH</div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-gold">{product.category}</p>
            <h3 className="mt-1 text-lg font-semibold text-ivory">{product.name}</h3>
          </div>
          <p className="text-lg font-semibold text-ember">{formatINR(product.price)}</p>
        </div>
        <p className="mt-3 text-sm leading-6 text-ivory/[0.62]">{product.description}</p>
        <div className="mt-4 rounded-md border border-line bg-black/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ivory/50">Why This Matches</p>
          <ul className="mt-2 space-y-2 text-sm text-ivory/[0.72]">
            {product.matchReasons.slice(0, 4).map((reason) => (
              <li key={reason} className="flex gap-2">
                <Check className="mt-0.5 shrink-0 text-gold" size={15} />
                {reason}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-ivory/[0.54]">{product.inventory} in stock</span>
          <div className="flex gap-2">
            <Button data-tour="ask-agent" variant="secondary" icon={<Bot size={16} />} onClick={() => navigate("/agent", { state: { selectedProduct: productToIntentContext(product) } })}>Ask Agent</Button>
            <Button icon={<Plus size={16} />} onClick={() => onSelect(product)}>Select</Button>
          </div>
        </div>
      </div>
    </motion.article>
    </NexoraSurface>
  );
}
