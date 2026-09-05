import { Link } from "react-router-dom";
import { Bot } from "lucide-react";
import { Button } from "../components/ui/Button";
import { products } from "../data/demo";
import { productToIntentContext } from "../lib/productIntent";
import { formatINR } from "../lib/utils";

export default function ShopPage({ merchant = false }: { merchant?: boolean }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <p className="text-xs uppercase tracking-[0.24em] text-gold">{merchant ? "Merchant Products" : "Shop"}</p>
      <h1 className="mt-2 text-4xl font-semibold">Agent-readable catalog</h1>
      <div data-tour="product-grid" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.slice(0, merchant ? 48 : 16).map((product) => (
          <article key={product.id} className="glass group overflow-hidden rounded-lg transition hover:border-gold/40">
            <Link to={`/product/${product.id}`} className="block">
              <img src={product.image} alt={product.name} className="h-40 w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
              <div className="p-4 pb-3">
                <p className="text-xs uppercase tracking-[0.18em] text-ivory/[0.42]">{product.category}</p>
                <h2 className="mt-2 min-h-12 font-semibold">{product.name}</h2>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-ember">{formatINR(product.price)}</span>
                  <span className="text-ivory/[0.48]">{product.inventory} in stock</span>
                </div>
              </div>
            </Link>
            <div className="px-4 pb-4 opacity-100 transition md:opacity-0 md:translate-y-1 md:group-hover:translate-y-0 md:group-hover:opacity-100">
              <Link data-tour="ask-agent" to="/agent" state={{ selectedProduct: productToIntentContext(product) }}>
                <Button className="w-full" variant="secondary" icon={<Bot size={15} />}>Ask Agent</Button>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
