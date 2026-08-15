# ✦ Dreamstack — where things stand

_Last updated: 13 August 2026_

**Live site:** https://dreamstack-ai.netlify.app
**Gallery:** https://dreamstack-ai.netlify.app/gallery

Start a new chat with Claude in this folder and say *"read STATUS.md, let's carry
on with Dreamstack"* — it'll pick up exactly here.

---

## ✅ Done and working

| Piece | State |
| --- | --- |
| Website (landing, sign-up, Studio, sharing, gallery) | Live |
| AI builds | Live on your own Anthropic key |
| Accounts + database | Supabase project `nwxgaceptjuapqiwvtfp` (shared, `ds_*` tables) |
| Payments — plans + credit packs | Live Stripe, verified working |
| Premium perks (history, embed, white-label, password links, custom domains) | Live |
| Remix gallery | Live |
| Link previews, SEO, Google Search Console | Done + verified |
| Your private analytics dashboard | Live on the Account page |
| Launch content | `LAUNCH-KIT.md` + `facebook-posts.csv` |

**Pricing:** Dreamer free (2 one-time credits) · Builder $19/mo (20) ·
Studio $49/mo (50) · Booster $9 (10) · Mega $29 (40). 1 build or edit = 1 credit.
Every tier is profitable even at worst-case AI cost.

---

## 📊 Reality check

- **1 account** (yours), **3 apps** built, **0 outside visitors**, **0 sales**.
- That's not a fault — **no marketing has happened yet**. The launch kit is
  still unopened.
- **The bottleneck is distribution, not the product.** Do not build more
  features until real people have used it.

---

## 🎯 Next actions (in priority order)

1. **Post something.** One 30-second screen recording of you typing a sentence
   and an app appearing. Scripts are in `LAUNCH-KIT.md`. This is the whole
   ballgame right now.
2. **Finish the Make.com → Facebook automation.** You need a Facebook *Page*
   first (personal profiles and groups can't be automated — Meta removed those
   APIs). Then: Google Sheets → Make → Facebook Pages, using
   `facebook-posts.csv`.
3. **Optional but offered:** auto-announce every new gallery app to Facebook.
   Create a Webhook module in Make, give Claude the URL, and it'll connect the
   database side.
4. **Decide the name.** "Dreamstack" collides with an existing company at
   dreamstack.us. Either keep it and grab `getdreamstack.com`, or rename to
   `onesentence.app` (Claude can do the whole rename). Cheapest to decide
   *before* you market.
5. **Housekeeping:** add `https://dreamstack-ai.netlify.app/**` to Supabase →
   Authentication → URL Configuration → Redirect URLs, so sign-up emails point
   at Dreamstack instead of your other app.

---

## 🔑 Things worth remembering

- **Deploying changes:** ask Claude to "deploy Dreamstack" — it builds and
  ships in ~2 minutes. Nothing is manual.
- **Credit counts live in three places** and must stay in sync:
  `src/lib/plans.ts` (what customers see), `PLAN_LIMITS` in
  `supabase/functions/generate/index.ts` (enforced), `PACK_CREDITS` in
  `supabase/functions/checkout/index.ts`. Pack sizes also appear in the Stripe
  product *names*, which show at checkout.
- **Your API key was pasted into a chat** — rotate it at console.anthropic.com
  whenever convenient, and update the `ANTHROPIC_API_KEY` secret in Supabase.
- **Custom domains for customers** need one manual step from you: add their
  domain as an alias in the Netlify dashboard.
- **Cheaper AI:** set a Supabase secret `DREAMSTACK_MODEL` to `claude-sonnet-5`
  to cut cost per build ~3-5x with very good quality.

See `README.md` for the full owner's manual.
