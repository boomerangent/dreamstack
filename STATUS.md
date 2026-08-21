# ✦ Dreamstack — where things stand

_Last updated: 21 August 2026_

**Live site:** https://getdreamstack.com (on Hostinger since 21 Aug 2026)
**Gallery:** https://getdreamstack.com/gallery
**Old address:** https://dreamstack-ai.netlify.app — still works; to be forwarded to the new one.

Start a new chat with Claude in this folder and say *"read STATUS.md, let's carry
on with Dreamstack"* — it'll pick up exactly here.

---

## ✅ Done and working

| Piece | State |
| --- | --- |
| Website (landing, sign-up, Studio, sharing, gallery) | Live at getdreamstack.com (Hostinger Business hosting) |
| AI builds | Live on your own Anthropic key |
| Accounts + database | Supabase project `nwxgaceptjuapqiwvtfp` (shared, `ds_*` tables) |
| Payments — plans + credit packs | Live Stripe, verified working (no real sale yet) |
| Premium perks (history, embed, white-label, password links, custom domains) | Live |
| Remix gallery, link previews, SEO | Live |
| Admin panel (`/admin`) — people, credits, plans, app flags | Live, owner-only |
| Launch content | `LAUNCH-KIT.md` + `facebook-posts.csv` |

**Pricing:** Dreamer free (3 one-time welcome credits) · Builder $19/mo (20) ·
Studio $49/mo (50) · Booster $9 (10) · Mega $29 (40). 1 build or edit = 1 credit.

---

## 📊 Reality check

- **4 accounts** (3 are you), **6 apps** (all yours), **1 outside sign-up** who
  never built anything, **0 sales**, **0 marketing done**.
- **The bottleneck is distribution, not the product.**

---

## 🔧 Known problems (found 21 Aug)

1. **Visitor stats never worked** — one-line bug in `src/lib/analytics.ts`
   (the tracking call is never actually sent). Dashboard shows zeros. Ask
   Claude to "fix the stats bug" — 2 minutes plus a redeploy.
2. **AdSense section on the Account page is half-built** — it saves the
   publisher ID but nothing ever shows ads. Finish it or hide it before
   marketing.

---

## 🎯 Next actions (in priority order)

1. **Supabase → Authentication → URL Configuration → Redirect URLs → add
   `https://getdreamstack.com/**`.** Without it, Google sign-in on the new
   address bounces people to your other app.
2. **Forward the old Netlify address** to getdreamstack.com so old links keep
   working — deploy the `netlify-redirect/` folder to the Netlify site (needs
   Netlify access; ask Claude).
3. **Google Search Console** → add `https://getdreamstack.com` as a property →
   submit `/sitemap.xml`.
4. **Post something.** One 30-second screen recording of you typing a sentence
   and an app appearing. Scripts are in `LAUNCH-KIT.md`.
5. Optional: `startup-credits.xlsx` lists free-credit programs worth applying to
   (Microsoft for Startups, Supabase Startup Program).

---

## 🔑 Things worth remembering

- **Deploying changes:** ask Claude to "deploy Dreamstack to Hostinger" (steps
  are in README → *Hosting on Hostinger*).
- **Changing the domain:** `npm run site-url https://new-domain` then rebuild
  and redeploy.
- **Credit counts live in three places** and must stay in sync:
  `src/lib/plans.ts`, `PLAN_LIMITS` in `supabase/functions/generate/index.ts`,
  `PACK_CREDITS` in `supabase/functions/checkout/index.ts` (and the Stripe
  product names).
- **Your API key was pasted into a chat once** — rotate it at
  console.anthropic.com when convenient and update the Supabase secret.
- **Cheaper AI:** set a Supabase secret `DREAMSTACK_MODEL` to `claude-sonnet-5`
  to cut cost per build ~3-5x.

See `README.md` for the full owner's manual.
