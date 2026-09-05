import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { products } from "../data/demo";
import { formatINR } from "../lib/utils";

export default function CartPage() {
  const items = products.filter((product) => ["NEC102", "JCA210"].includes(product.id));
  const total = items.reduce((sum, product) => sum + product.price, 0);
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <h1 className="text-4xl font-semibold">Cart preserved</h1>
      <div className="mt-8 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="glass flex items-center justify-between gap-4 rounded-lg p-4">
            <span>{item.name}</span>
            <span className="font-semibold text-ember">{formatINR(item.price)}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-line pt-5 text-xl font-semibold">
        <span>Total</span>
        <span>{formatINR(total)}</span>
      </div>
      <Link to="/checkout"><Button className="mt-8">Proceed To Checkout</Button></Link>
    </div>
  );
}
