/** FAQs, policies and house copy — Phase 1 editorial, reviewed for honest claims. */

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Where does PARADELLE ship?",
    a: "We currently ship across India. Orders are dispatched from our atelier within 1–2 business days, Monday to Saturday. Metro cities typically receive orders in 2–4 business days; other pin codes in 3–7 business days.",
  },
  {
    q: "How much does shipping cost?",
    a: "A flat fee of ₹99 applies to orders below ₹1,500. Orders of ₹1,500 and above ship free. The exact amount is always shown on the cart page and again at checkout before you pay — there are no additional charges at delivery.",
  },
  {
    q: "Will my chocolate melt in transit?",
    a: "Every order travels in temperature-protective insulated packaging. In warm months we add food-grade cool packs at no extra cost. If a parcel ever arrives melted or heat-bloomed, send us a photo within 48 hours of delivery and we will replace it or refund you — your choice.",
  },
  {
    q: "Which payment methods do you accept?",
    a: "All payments are processed securely by Razorpay — UPI, credit and debit cards, net banking and leading wallets. We never see or store your card details. To keep every order traceable and chilled-chain reliable, we do not offer Cash on Delivery.",
  },
  {
    q: "Do you offer Cash on Delivery?",
    a: "No. Chocolate is temperature-sensitive, and prepaid orders let us plan dispatch and insulation precisely. Every payment is protected by Razorpay, and our refund policy has you covered if anything goes wrong.",
  },
  {
    q: "Do I need an account to order?",
    a: "No — guest checkout is always available with just an email and a delivery address. Creating an account afterwards (or before) lets you track orders, see history and check out faster next time.",
  },
  {
    q: "How should I store my chocolate?",
    a: "Keep bars in a cool, dry place at 16–20°C away from sunlight and strong odours. Avoid refrigeration where possible; if your climate demands it, seal the bar airtight and let it return to room temperature before opening to prevent condensation.",
  },
  {
    q: "What is the shelf life?",
    a: "Our bars are best enjoyed within 12 months of production. Each wrapper carries its best-before date. Because we craft in small batches, bars typically ship within weeks of being moulded.",
  },
  {
    q: "Are the chocolates suitable for vegetarians?",
    a: "Yes, all four bars are vegetarian. Please check each product page for full ingredient decks and allergen declarations before ordering if you have dietary restrictions.",
  },
  {
    q: "Can I send PARADELLE as a gift?",
    a: "Absolutely. Add a complimentary gift note at checkout (Phase 2) — orders ship in our signature ivory-and-gold presentation with no pricing documents inside the parcel.",
  },
];

export type PolicyKey = "shipping" | "refunds" | "privacy" | "terms";

export const POLICIES: Record<
  PolicyKey,
  { title: string; eyebrow: string; updated: string; sections: { heading: string; body: string[] }[] }
> = {
  shipping: {
    title: "Shipping Policy",
    eyebrow: "Delivered with care",
    updated: "Last updated: January 2026",
    sections: [
      {
        heading: "Dispatch",
        body: [
          "Orders are crafted, quality-checked and dispatched from the PARADELLE atelier within 1–2 business days (Monday–Saturday, excluding public holidays). You will receive a confirmation with tracking as soon as your parcel leaves us.",
        ],
      },
      {
        heading: "Charges & free shipping",
        body: [
          "A flat shipping fee of ₹99 applies to orders below ₹1,500. Orders of ₹1,500 or more ship free, anywhere we deliver in India. The exact shipping charge is always displayed on the cart page and re-confirmed at checkout — before you pay. There are no handling surcharges, and nothing additional is collected at delivery.",
        ],
      },
      {
        heading: "Transit times",
        body: [
          "Metro cities: 2–4 business days after dispatch. All other serviceable pin codes: 3–7 business days. Remote locations may occasionally take longer; tracking will always show the current status.",
        ],
      },
      {
        heading: "Temperature protection",
        body: [
          "Chocolate is sensitive to heat. Every parcel ships in insulated, temperature-protective packaging; food-grade cool packs are added automatically in warm months at no cost to you. Please bring parcels indoors promptly after delivery.",
        ],
      },
      {
        heading: "Delays & support",
        body: [
          "If your tracking has not moved for more than 4 business days, write to us at hello@paradelle.store with your order number and we will investigate with the courier immediately.",
        ],
      },
    ],
  },
  refunds: {
    title: "Refund & Replacement Policy",
    eyebrow: "Our honest promise",
    updated: "Last updated: January 2026",
    sections: [
      {
        heading: "Damaged, melted or incorrect orders",
        body: [
          "If your chocolate arrives melted, heat-bloomed, damaged, or if you received the wrong item, email hello@paradelle.store within 48 hours of delivery with your order number and a photograph of the parcel and product. We will replace the item or refund you in full — whichever you prefer.",
        ],
      },
      {
        heading: "Food-safety returns",
        body: [
          "Because chocolate is a perishable food product, we cannot accept returns of opened or undamaged items for change-of-mind reasons. This protects the safety and integrity of every PARADELLE bar.",
        ],
      },
      {
        heading: "Refund timeline",
        body: [
          "Approved refunds are issued to the original payment method via Razorpay within 3–5 business days of approval. Banks typically reflect the credit within 5–7 business days after that. We will email you the reference as soon as it is processed.",
        ],
      },
      {
        heading: "Cancellations",
        body: [
          "Orders can be cancelled for a full refund any time before dispatch — usually within a few hours of ordering, as we pack quickly. Once a parcel has shipped, the damaged/incorrect policy above applies.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    eyebrow: "Your data, respected",
    updated: "Last updated: January 2026",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Only what an order genuinely needs: your name, email, phone number and delivery address; your order history; and, if you subscribe, your email for our newsletter. Our website does not use advertising trackers or sell data to anyone.",
        ],
      },
      {
        heading: "Payments",
        body: [
          "Payments are processed end-to-end by Razorpay. PARADELLE never sees, stores or has access to your full card, UPI or banking credentials.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To fulfil and deliver your orders, provide support, and — if you opt in — send occasional letters about new releases. Every marketing email includes a working unsubscribe link. Transactional emails (order confirmations, receipts) are sent as needed.",
        ],
      },
      {
        heading: "Storage & security",
        body: [
          "Account passwords are stored only as salted cryptographic hashes (scrypt) — never in plain text. Order data is held on secured infrastructure with encrypted transport (HTTPS) throughout.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "Email privacy@paradelle.store to access, correct or delete your personal data. Deleting your account removes your profile; order records required for tax and accounting law are retained as mandated, then purged.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    eyebrow: "The fine print, plainly",
    updated: "Last updated: January 2026",
    sections: [
      {
        heading: "The house",
        body: [
          "PARADELLE CHOCOLATES (\u201CPARADELLE\u201D, \u201Cwe\u201D) operates this website and sells small-batch chocolate direct to customers in India. By ordering, you agree to these terms alongside our Shipping, Refund and Privacy policies.",
        ],
      },
      {
        heading: "Pricing & availability",
        body: [
          "All prices are MRPs in Indian rupees, inclusive of applicable taxes. Because we work in small batches, a bar may occasionally sell out; if an item becomes unavailable after you order, we will contact you promptly and refund that item in full.",
        ],
      },
      {
        heading: "Payments",
        body: [
          "All payments are prepaid and processed securely by Razorpay (cards, UPI, net banking, wallets). We do not offer Cash on Delivery. An order is confirmed once payment succeeds; orders awaiting payment are held as pending.",
        ],
      },
      {
        heading: "Product information",
        body: [
          "We describe ingredients, allergens and nutrition honestly and to the best of our knowledge; always read the label on your wrapper, which is the definitive reference. Photographs are representative of the product.",
        ],
      },
      {
        heading: "Accounts",
        body: [
          "You are responsible for keeping your account credentials confidential. Guest checkout is always available if you prefer not to create an account.",
        ],
      },
      {
        heading: "Contact & disputes",
        body: [
          "Write to hello@paradelle.store for any concern — we answer within two business days. These terms are governed by the laws of India.",
        ],
      },
    ],
  },
};

export const NAV_LINKS = [
  { href: "/collection", label: "Collection" },
  { href: "/our-story", label: "Our Story" },
  { href: "/craftsmanship", label: "Craftsmanship" },
  { href: "/faqs", label: "FAQs" },
  { href: "/contact", label: "Contact" },
];
