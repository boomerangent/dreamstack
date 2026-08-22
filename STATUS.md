# ✦ Dreamstack — where things stand

_Last updated: 21 August 2026_

**Live site:** https://getdreamstack.com (on Hostinger since 21 Aug 2026)
**Gallery:** https://getdreamstack.com/gallery
**Old address:** https://dreamstack-ai.netlify.app — forwards to the new one (deployed 21 Aug).

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

**Pricing:** Dreamer free (3 one-time welcome credits) · Builder $19/mo (12) ·
Studio $49/mo (25) · Booster $9 (10) · Mega $29 (40). 1 build or edit = 1 credit.

---

## 📊 Reality check

- **4 accounts** (3 are you), **6 apps** (all yours), **1 outside sign-up** who
  never built anything, **0 sales**, **0 marketing done**.
- **The bottleneck is distribution, not the product.**

---


## 🎯 Next actions (in priority order)

Everything technical is done. What's left is **distribution** — getting real
people to the site.

1. **Post your launch demo to TikTok.** You have a TikTok account. Record one
   30-second clip: type a sentence, watch an app appear, share the link.
   Ready-made scripts are in `LAUNCH-KIT.md`. This is the whole ballgame now.
2. **Do a $9 self-purchase** once, to prove the live payment flow end to end.
3. Optional: apply for free startup credits (`startup-credits.xlsx`) —
   Microsoft for Startups (~$5k) and Supabase Startup Program (~$3k).

_Done 21 Aug: moved to getdreamstack.com (Hostinger), Supabase sign-in URLs,
old Netlify address forwards over, visitor-stats bug fixed, unfinished AdSense
section hidden, Google Search Console verified + sitemap submitted (5 pages
found)._

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
