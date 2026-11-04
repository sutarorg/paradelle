/**
 * PARADELLE CHOCOLATES — single source of truth for the four-product catalogue.
 *
 * NOTE (Phase 1): nutritional values, ingredient decks and cocoa percentages are
 * realistic industry-typical placeholders chosen to keep commerce screens complete.
 * They MUST be confirmed against final production specifications before launch.
 * All prices are final MRPs in integer rupees, inclusive of taxes — prestige round
 * pricing, no strike-throughs, no invented discounts (ethical persuasion policy).
 */

export type Product = {
  slug: string;
  name: string;
  shortName: string;
  line: string;
  cocoaPercent: number;
  weightGrams: number;
  /** MRP inclusive of all taxes (₹). Never displayed as a fake discount. */
  price: number;
  tagline: string;
  description: string;
  tastingNotes: string[];
  ingredients: string[];
  allergens: string[];
  crossContact: string;
  nutritionPer100g: { energy: string; protein: string; carbs: string; sugars: string; fat: string; satFat: string; sodium: string };
  storage: string;
  shippingNote: string;
  images: { front: string; angle: string };
  accent: string; // hex accent used for chips/details
};

const STORAGE =
  "Store in a cool, dry place at 16–20°C, away from direct sunlight and strong odours. Do not refrigerate unless ambient temperatures exceed 24°C; if refrigerated, seal airtight and allow the bar to return to room temperature before opening. Best enjoyed within 12 months of production.";

const SHIPPING =
  "Dispatched from our atelier within 1–2 business days in temperature-protective, insulated packaging (cool packs added automatically in warm months at no extra cost). Typical transit: 2–4 business days to metros and 3–7 business days elsewhere in India. Complimentary shipping on orders of ₹1,500 or more; a flat ₹99 otherwise.";

export const PRODUCTS: Product[] = [
  {
    slug: "signature-milk",
    name: "Signature Milk Chocolate",
    shortName: "Signature Milk",
    line: "The Signature Collection",
    cocoaPercent: 45,
    weightGrams: 50,
    price: 45000,
    tagline: "Slow-roasted cacao folded into cream, caramel and warm vanilla.",
    description:
      "Our house milk chocolate is defined by patience: cacao slow-roasted in small batches, conched until silken, then balanced with fresh dairy and a whisper of vanilla bean. The result is a 45% milk couverture with the depth of a darker bar and the softness of classic European milk chocolate — no cloying sweetness, no shortcuts.",
    tastingNotes: ["Toffee", "Warm milk", "Vanilla bean", "Honeyed finish"],
    ingredients: ["Cane sugar", "Cocoa butter", "Whole milk powder", "Cocoa mass", "Natural vanilla"],
    allergens: ["Milk"],
    crossContact:
      "Made in an atelier that also handles tree nuts (hazelnut, almond, pistachio) and gluten-free ingredients. Not suitable for those with milk allergy.",
    nutritionPer100g: { energy: "555 kcal", protein: "7.5 g", carbs: "50 g", sugars: "47 g", fat: "35 g", satFat: "21 g", sodium: "0.18 g" },
    storage: STORAGE,
    shippingNote: SHIPPING,
    images: { front: "/images/products/signature-milk-1.webp", angle: "/images/products/signature-milk-2.webp" },
    accent: "#C9A66B",
  },
  {
    slug: "signature-dark",
    name: "Signature Dark Chocolate",
    shortName: "Signature Dark",
    line: "The Signature Collection",
    cocoaPercent: 72,
    weightGrams: 50,
    price: 55000,
    tagline: "A 72% dark couverture — red fruit, espresso and a long, quiet finish.",
    description:
      "The bar our chocolatiers judge ourselves by. A 72% dark couverture built for length rather than bitterness: bright red-fruit notes open the palate, deepen into espresso and toasted cacao, and resolve in a clean, lingering finish. Minimal ingredients, maximum patience — conched slowly and rested before tempering.",
    tastingNotes: ["Red fruit", "Espresso", "Toasted cacao", "Long finish"],
    ingredients: ["Cocoa mass", "Cane sugar", "Cocoa butter", "Natural vanilla"],
    allergens: [],
    crossContact:
      "No milk ingredients in the recipe; made in an atelier that handles milk and tree nuts (hazelnut, almond, pistachio). May contain traces.",
    nutritionPer100g: { energy: "585 kcal", protein: "9.0 g", carbs: "30 g", sugars: "26 g", fat: "43 g", satFat: "26 g", sodium: "0.02 g" },
    storage: STORAGE,
    shippingNote: SHIPPING,
    images: { front: "/images/products/signature-dark-1.webp", angle: "/images/products/signature-dark-2.webp" },
    accent: "#38202C",
  },
  {
    slug: "crunchy-nut",
    name: "Crunchy Nut Chocolate",
    shortName: "Crunchy Nut",
    line: "The Signature Collection",
    cocoaPercent: 45,
    weightGrams: 50,
    price: 50000,
    tagline: "Roasted hazelnuts and almonds folded through our signature milk couverture.",
    description:
      "Whole hazelnuts and almonds are roasted in-house until deeply fragrant, then folded generously through our 45% milk couverture so every square carries real crunch. It is the most familiar bar in the collection — and, because the nuts are roasted the same week the bar is moulded, quietly the most luxurious.",
    tastingNotes: ["Roasted hazelnut", "Praline crunch", "Caramel", "Warm chocolate"],
    ingredients: ["Cane sugar", "Cocoa butter", "Whole milk powder", "Cocoa mass", "Roasted hazelnuts (8%)", "Roasted almonds (6%)", "Natural vanilla"],
    allergens: ["Hazelnuts", "Almonds", "Milk"],
    crossContact: "Made in an atelier that also handles pistachio. Not suitable for those with tree-nut or milk allergy.",
    nutritionPer100g: { energy: "560 kcal", protein: "9.0 g", carbs: "47 g", sugars: "44 g", fat: "36 g", satFat: "19 g", sodium: "0.16 g" },
    storage: STORAGE,
    shippingNote: SHIPPING,
    images: { front: "/images/products/crunchy-nut-1.webp", angle: "/images/products/crunchy-nut-2.webp" },
    accent: "#795038",
  },
  {
    slug: "pistachio-filled",
    name: "Pistachio Filled Chocolate",
    shortName: "Pistachio Filled",
    line: "The Signature Collection",
    cocoaPercent: 60,
    weightGrams: 50,
    price: 70000,
    tagline: "A dark shell giving way to a silken, generously roasted pistachio cream.",
    description:
      "The centrepiece of the maison. A snappy 60% dark shell is moulded thin and filled while still warm with a pistachio cream made from generously roasted nuts, ground slowly into a velvet paste. One square in and the shell gives way — dark cacao first, then waves of toasted pistachio. Our most indulgent recipe, priced accordingly.",
    tastingNotes: ["Pistachio cream", "Cocoa snap", "Toasted nuts", "Velvet finish"],
    ingredients: ["Cocoa mass", "Cane sugar", "Cocoa butter", "Pistachio paste (18%)", "Whole milk powder", "Natural vanilla"],
    allergens: ["Pistachios", "Milk"],
    crossContact: "Made in an atelier that also handles hazelnut and almond. Not suitable for those with tree-nut or milk allergy.",
    nutritionPer100g: { energy: "548 kcal", protein: "8.6 g", carbs: "46 g", sugars: "42 g", fat: "35 g", satFat: "17 g", sodium: "0.14 g" },
    storage: STORAGE,
    shippingNote: SHIPPING,
    images: { front: "/images/products/pistachio-filled-1.webp", angle: "/images/products/pistachio-filled-2.webp" },
    accent: "#5B6238",
  },
];

export function getProduct(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function pricePer100g(p: Product) {
  return Math.round((p.price / p.weightGrams) * 100);
}
