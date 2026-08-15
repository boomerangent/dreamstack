export interface Plan {
  id: "free" | "pro" | "studio";
  name: string;
  price: string;
  priceNote: string;
  gensPerMonth: number;
  blurb: string;
  features: string[];
  cta: string;
  highlight: boolean;
}

/**
 * Display copy for the pricing tiers. The enforced limits live in the
 * `generate` server function — keep PLAN_LIMITS there in sync with these.
 * 1 build (new app or follow-up edit) = 1 credit.
 */
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Dreamer",
    price: "$0",
    priceNote: "forever",
    gensPerMonth: 2,
    blurb: "Try the magic. Build your first apps.",
    features: [
      "2 welcome credits — on us, one time",
      "Unlimited viewing & sharing",
      "Public share links",
      "Top up with credit packs any time",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    id: "pro",
    name: "Builder",
    price: "$19",
    priceNote: "/ month",
    gensPerMonth: 20,
    blurb: "For people shipping ideas every week.",
    features: [
      "20 credits / month",
      "Private apps (share only when ready)",
      "Version history — restore any build",
      "Embed your apps on any website",
    ],
    cta: "Go Builder",
    highlight: true,
  },
  {
    id: "studio",
    name: "Studio",
    price: "$49",
    priceNote: "/ month",
    gensPerMonth: 50,
    blurb: "For power users, agencies and teams.",
    features: [
      "50 credits / month",
      "Everything in Builder",
      "White-label — hide the Dreamstack badge",
      "Password-protected links + custom domain",
    ],
    cta: "Go Studio",
    highlight: false,
  },
];

export const PLAN_LIMITS: Record<string, number> = {
  free: 2,
  pro: 20,
  studio: 50,
};

export interface CreditPack {
  id: "small" | "large";
  name: string;
  credits: number;
  price: string;
  perCredit: string;
  blurb: string;
}

/** One-time top-ups. Purchased credits never expire and are used after the
 *  month's plan credits run out. Price IDs live in the checkout function's
 *  STRIPE_PRICE_PACK_SMALL / STRIPE_PRICE_PACK_LARGE secrets. */
export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "small",
    name: "Booster",
    credits: 10,
    price: "$9",
    perCredit: "90¢ / credit",
    blurb: "A quick refill to finish what you started.",
  },
  {
    id: "large",
    name: "Mega pack",
    credits: 40,
    price: "$29",
    perCredit: "73¢ / credit — best top-up value",
    blurb: "For heavy builders who'd rather not subscribe.",
  },
];

export function planName(id: string): string {
  return PLANS.find((p) => p.id === id)?.name ?? "Dreamer";
}
