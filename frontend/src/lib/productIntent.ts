import type { Product } from "../types/commerce";
import { formatINR } from "./utils";

export type SelectedProductIntent = {
  id: string;
  sku: string;
  name: string;
  category: string;
  price_inr: number;
};

export function productToIntentContext(product: Product): SelectedProductIntent {
  return {
    id: product.id,
    sku: product.id,
    name: product.name,
    category: product.category,
    price_inr: product.price,
  };
}

function categoryGuidance(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes("gaming") || normalized.includes("esports")) return "recommend compatible gaming accessories such as a mouse, keyboard, headset, controller, or desk accessory";
  if (normalized.includes("audio") || normalized.includes("headphone") || normalized.includes("earbud") || normalized.includes("speaker")) return "recommend relevant audio accessories such as cases, cables, stands, or chargers";
  if (normalized.includes("jewellery") || normalized.includes("jewelry") || normalized.includes("necklace") || normalized.includes("ring")) return "suggest only relevant jewellery accessories or gift add-ons";
  if (normalized.includes("fashion") || normalized.includes("apparel")) return "recommend matching apparel or accessories";
  if (normalized.includes("footwear") || normalized.includes("shoe")) return "recommend relevant socks, care items, or sports accessories";
  if (normalized.includes("computer") || normalized.includes("laptop") || normalized.includes("office")) return "recommend compatible accessories such as a mouse, sleeve, hub, keyboard, or charger";
  if (normalized.includes("mobile") || normalized.includes("phone")) return "recommend compatible mobile accessories such as a case, charger, cable, or power bank";
  if (normalized.includes("photo") || normalized.includes("camera")) return "recommend relevant photography accessories such as a tripod, memory card, or carry bag";
  if (normalized.includes("fitness") || normalized.includes("sport") || normalized.includes("running")) return "recommend relevant running or fitness accessories";
  if (normalized.includes("home")) return "recommend complementary home items";
  return "recommend relevant complementary products from the same shopping context";
}

export function buildProductIntent(product: SelectedProductIntent) {
  return `I'm interested in the ${product.name} for ${formatINR(product.price_inr)}. Help me evaluate it and ${categoryGuidance(product.category)} while keeping the total within a sensible budget.`;
}
