# ✦ Dreamstack

Your AI app builder — people describe an app in a sentence, watch the AI build
it live, then share it with one link. Subscriptions gate how many builds each
person gets per month.

**Live site:** https://dreamstack-ai.netlify.app

## How it's put together

| Piece | Where | What it does |
| --- | --- | --- |
| Website (this folder) | Netlify — site `dreamstack-ai` | Landing page, sign-up, builder studio, share pages |
| Database + accounts | Supabase project `nwxgaceptjuapqiwvtfp` (shared with your other app; Dreamstack uses `ds_*` tables) | Users, saved apps, plans, usage counters |
| Server functions | Supabase Edge Functions: `generate`, `checkout`, `portal`, `stripe-webhook` | AI builds, Stripe checkout/portal/webhook |
| AI | Claude API (Anthropic), model `claude-opus-5` by default | Writes the apps users ask for |
| Payments | Stripe (once you connect it) | $19 Builder and $49 Studio subscriptions |

## What works right now

- The full site, sign-up/sign-in, the Studio, saving apps, share links, and
  monthly build limits.
- **Demo mode:** until you add an AI key, every "build" returns a working
  sample app with a banner explaining demo mode. Nothing is charged and demo
  builds don't use up anyone's allowance.
- Upgrade buttons show a friendly "payments aren't connected yet" message
  until Stripe is set up.

## Switch on the real AI (one step)

1. Create an API key at https://console.anthropic.com (API keys section).
   You'll need to add billing credit there — this is what pays for each build.
2. Open your Supabase dashboard →
   https://supabase.com/dashboard/project/nwxgaceptjuapqiwvtfp/functions/secrets
   and add a secret:
   - Name: `ANTHROPIC_API_KEY` — Value: your key (starts with `sk-ant-`)

That's it — the next build on the site is a real AI build.

### What each build costs you

With the default model (Claude Opus 5), a typical app build uses roughly
$0.15–$0.40 of API credit depending on app size. Every build or edit costs
the customer 1 credit. Sanity-check against your prices:

| Offer | Price | Credits | Your worst-case AI cost | Worst-case margin |
| --- | --- | --- | --- | --- |
| Dreamer (free) | $0 | 3 welcome credits, one-time | ~$1.20 max, ever | — |
| Builder | $19 / mo | 12 / month | ~$5 | **+$14** |
| Studio | $49 / mo | 25 / month | ~$10 | **+$39** |
| Booster pack | $9 once | 10 (never expire) | ~$4 | **+$5** |
| Mega pack | $29 once | 40 (never expire) | ~$16 | **+$13** |

Every offer is profitable even at worst-case build cost, and the monthly
plans stay the best value per credit (~95¢ on a plan vs. 90¢/73¢ on packs is
deliberately close — packs are a convenience top-up, not a cheaper route).
To change any of it: credit counts live in `src/lib/plans.ts` (what customers
see), `PLAN_LIMITS` in `supabase/functions/generate/index.ts` (enforced plan
credits) and `PACK_CREDITS` in `supabase/functions/checkout/index.ts`
(credits granted per pack). Keep them in sync, and keep the Stripe product
names — which show at checkout — matching the pack sizes.

Monthly plan credits are spent first; purchased pack credits are the backup
bank. Free welcome credits never renew — a free account can never cost you
more than its one-time trial (~$2). Pack sizes/prices live in
`src/lib/plans.ts` (display) and the `checkout` function's `PACK_CREDITS`
(granted amounts).

Two easy levers if margins feel thin:

- Add a Supabase secret `DREAMSTACK_MODEL` = `claude-sonnet-5` — roughly
  3–5× cheaper per build with very good quality.
- Change plan prices/limits: edit `src/lib/plans.ts` (what customers see)
  **and** `PLAN_LIMITS` in `supabase/functions/generate/index.ts` (what's
  enforced), then redeploy both.

## Connect Stripe (to get paid)

1. Create a Stripe account at https://stripe.com (you do this part yourself —
   it involves your business + bank details).
2. In Stripe → Product catalog, create four products and copy each **price
   ID** (starts with `price_`):
   - "Dreamstack Builder" — **recurring monthly** at $19/mo
   - "Dreamstack Studio" — **recurring monthly** at $49/mo
   - "Dreamstack Booster pack (10 credits)" — **one-time** at $9
   - "Dreamstack Mega pack (40 credits)" — **one-time** at $29
3. In Stripe → Developers → Webhooks, add an endpoint:
   - URL: `https://nwxgaceptjuapqiwvtfp.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted`
   - Copy the **signing secret** (starts with `whsec_`).
4. Add six more Supabase Edge Function secrets (same page as above):
   - `STRIPE_SECRET_KEY` — from Stripe → Developers → API keys (`sk_live_…`,
     or `sk_test_…` while testing)
   - `STRIPE_PRICE_PRO` — the $19/mo price ID
   - `STRIPE_PRICE_STUDIO` — the $49/mo price ID
   - `STRIPE_PRICE_PACK_SMALL` — the $9 one-time price ID
   - `STRIPE_PRICE_PACK_LARGE` — the $29 one-time price ID
   - `STRIPE_WEBHOOK_SECRET` — the `whsec_…` value

Upgrades, plan changes, cancellations and the "Manage billing" button all
start working immediately.

## Premium features (what each plan unlocks)

| Feature | Plan | Where |
| --- | --- | --- |
| Private apps | Builder+ | Studio → "Public/Private" button |
| Version history (restore any earlier build) | Builder+ | Studio → "History" |
| Embed apps on any website (copy-paste snippet) | Builder+ | Studio → More ⋯ |
| Hide the "Built with Dreamstack" badge (white-label) | Studio | Studio → More ⋯ |
| Password-protected share links | Studio | Studio → More ⋯ (passwords are stored hashed, checked server-side) |
| Custom domain per app | Studio | Studio → More ⋯ |

Plan gating is enforced in the app's interface; every build/edit is
snapshotted to `ds_app_versions` regardless of plan, so users instantly get
their full history when they upgrade.

### Custom domains — your 2-minute step per customer

When a Studio customer connects a domain (say `myapp.com`), two things make it
live:

1. **They** add a DNS CNAME record pointing `myapp.com` →
   `dreamstack-ai.netlify.app` (the app tells them this automatically).
2. **You** attach the domain in Netlify: https://app.netlify.com/projects/dreamstack-ai
   → Domain management → **Add domain alias** → enter their domain. SSL
   certificates happen automatically a few minutes after their DNS spreads.

The site recognizes the domain and serves their app full-screen on it. This
manual step is worth automating once you have steady add-on sales — ask
Claude when you're there.

## One Supabase auth note (worth doing)

Dreamstack shares its Supabase project with your other app, so confirmation
emails currently point at that app's address. Fix: Supabase dashboard → 
Authentication → URL Configuration → add
`https://dreamstack-ai.netlify.app/**` to **Redirect URLs**. (Also consider a
custom SMTP sender there before real traffic — the built-in mailer is heavily
rate-limited.)

## Working on the site

```bash
cd dreamstack
npm install
npm run dev        # local dev at http://localhost:5173
npm run build      # production build into dist/
```

- `.env` holds the two public `VITE_…` values (already set locally and on
  Netlify — they're safe to expose; the database is protected by row-level
  security).
- Server function code lives in `supabase/functions/*` — ask Claude to edit
  and redeploy them any time.
- To redeploy the website after changes: see **Hosting on Hostinger** below.

## Hosting on Hostinger (moved 21 Aug 2026)

The website files live on Hostinger **Business Web Hosting** (invoice H_49254764).
The AI engine, accounts, database and payments stay on Supabase / Stripe —
nothing changed there. The old Netlify address keeps working until it is
pointed at the new one.

**Deploy a new version** — or just ask Claude to "deploy Dreamstack to Hostinger":

1. `npm run build` — makes the `dist/` folder.
2. `npm run zip` — packs it into `dreamstack-hostinger.zip`.
3. hPanel → Websites → **getdreamstack.com** → File manager → **Open**. Go into
   `public_html`, click the upload icon (top right) and upload the zip.
4. Right-click the zip → **Extract**. Folder name: `public_html`. Destination:
   double-click `..` so it says "Currently navigating on: /files/". Tick
   **Overwrite existing files** → Extract. (This drops the files straight into
   the site root instead of a sub-folder.)
5. Delete the zip from `public_html`. Done — changes are live immediately
   (if you don't see them, hPanel → Cache → Clear cache).

**Move to a new domain** (one command does the find-and-replace):

1. `npm run site-url https://your-domain.com` — updates `index.html`,
   `robots.txt`, `sitemap.xml` and `.env` together.
2. `npm run build`, then deploy as above.
3. Supabase → Authentication → URL Configuration → add
   `https://your-domain.com/**` to **Redirect URLs**.
4. Google Search Console → add the new address as a property → submit
   `/sitemap.xml`.
5. Netlify → set `dreamstack-ai.netlify.app` to redirect to the new address so
   old links keep working (ask Claude).

`public/.htaccess` holds the server rules Hostinger needs (page links like
`/gallery` are answered by the app, https is forced). Keep it.

## Things to know

- **Name check:** "Dreamstack" was picked as a working name — before spending
  on marketing, search for trademark conflicts and grab a domain you like
  (Netlify → Domain settings lets you attach a custom domain in minutes).
- **Free-plan apps are public.** Private apps are a paid perk (enforced in
  the UI; the share page only ever shows apps marked public).
- **Generated apps are single-file HTML** running in a sandboxed frame —
  perfect for tools, games, trackers and mini-apps. Multi-page apps with
  their own databases would be a v2 feature.
- **Legal pages** (`/terms`, `/privacy`) are honest placeholders — have a
  professional review them before charging real customers.
