import { Link, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { Bot } from "lucide-react";
import { Button } from "../components/ui/Button";
import { products } from "../data/demo";
import { productToIntentContext } from "../lib/productIntent";
import { formatINR } from "../lib/utils";

export default function ProductPage() {
  const { id } = useParams();
  const product = products.find((item) => item.id === id) ?? products[0];
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2 md:px-6">
      <motion.img src={product.image} alt={product.name} animate={{ y: [0, -4, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="h-[480px] w-full rounded-2xl border border-line object-cover shadow-[0_34px_110px_rgba(0,0,0,0.42)]" />
      <section className="self-center">
        <p className="text-xs uppercase tracking-[0.24em] text-gold">{product.category} · {product.id}</p>
        <h1 className="mt-3 text-4xl font-semibold">{product.name}</h1>
        <p className="mt-4 text-3xl font-semibold text-ember">{formatINR(product.price)}</p>
        <p className="mt-5 text-ivory/[0.64]">{product.description}</p>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-line bg-white/[0.04] p-3">
            <dt className="text-xs uppercase tracking-[0.16em] text-ivory/[0.42]">Inventory</dt>
            <dd className="mt-1 font-semibold text-ivory">{product.inventory} in stock</dd>
          </div>
          <div className="rounded-md border border-line bg-white/[0.04] p-3">
            <dt className="text-xs uppercase tracking-[0.16em] text-ivory/[0.42]">Category</dt>
            <dd className="mt-1 font-semibold text-ivory">{product.category}</dd>
          </div>
        </dl>
        <div className="mt-6 rounded-lg border border-line bg-black/30 p-4">
          <p className="text-sm font-semibold">Agent capabilities</p>
          <pre className="mt-3 overflow-auto text-xs leading-5 text-ivory/[0.62]">{JSON.stringify({ can_recommend: true, can_add_to_cart: true, can_purchase: true, requires_purchase_authorization: true, checkout_endpoint: "/api/agent/checkout" }, null, 2)}</pre>
        </div>
        <Link to="/agent" state={{ selectedProduct: productToIntentContext(product) }}><Button className="mt-6" icon={<Bot size={16} />}>Ask Agent To Compare</Button></Link>
      </section>
    </div>
  );
}
