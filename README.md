# Vinted Assistant

A self-hosted, single-user assistant that monitors Vinted listings, filters them against your saved searches, alerts you fast, and provides an **honest assisted-checkout handoff** (with an optional local inspection stopwatch) that drops you onto the **real Vinted listing** — where Vinted's genuine Buy-now and any real pending-payment hold happen — to complete the purchase yourself.

Built with **Next.js 14 (App Router) + TypeScript + Tailwind + Drizzle ORM**. Runs on **SQLite out of the box** (zero infra) and on **PostgreSQL** in production.

---

## ⚠️ Read this first — honest capabilities

This app is deliberately honest about what is and isn't possible with Vinted. Please read the [full breakdown in `LIMITATIONS.md`](./LIMITATIONS.md). Summary:

| Capability | Status |
| --- | --- |
| Monitoring via official Vinted API | ❌ **Not available.** Vinted has no public/authorized API for this. |
| Monitoring via unofficial polling | ⚙️ **Implemented, requires your configuration.** Polls Vinted's internal catalog endpoint. Unofficial; **may violate Vinted's ToS** — you decide. |
| Offline demo monitoring (mock data) | ✅ **Fully implemented & tested.** Clearly labeled as mock in the UI. |
| Instant/near-real-time alerts | ⚙️ **Implemented**, but latency = your poll interval, **not** true push. |
| Browser push + in-app notifications | ✅ **Implemented.** Push requires VAPID keys (one command). |
| Telegram notifications | ⚙️ **Implemented, requires a bot token.** |
| Automated / "quick" purchase | 🚫 **Not possible & not done.** No authorized checkout API. Quick Buy opens the real listing. |
| Programmatic locker/pickup selection | 🚫 **Not possible.** We store preferences and remind you at checkout. |
| Assisted checkout to Vinted's real pending-payment hold | ⚙️ **Assisted handoff only.** The app records your journey and deep-links to the genuine listing; Vinted's real hold is created when **you** tap Buy now there. No reservation is faked, assumed, or timed by this app. |
| 15-minute delayed/reserved transaction created by this app | 🚫 **Does not exist / not done.** An optional inspection stopwatch is **local only** and never implies the item is held. |

**This app never:** asks for your Vinted password, stores payment-card details, simulates a successful purchase, or claims an item is reserved.

---

## Features

- **Saved searches** with keywords, brand, category, size, condition, min/max price, **max total cost (incl. fees)**, preferred/excluded brands, excluded keywords, seller-rating bounds, new-listings-only, price-drop alerts, and active/paused state. Create, edit, duplicate, pause, resume, delete.
- **Monitoring engine**: fetch → filter → dedup (unique Vinted id) → persist first-seen → detect price drops → notify. Records last check + status per search. Resumes after restart (all state in DB). Handles errors, rate limits (429 → backoff), and connection failures. **Does not** auto-create checkouts, timers, or reservations on detection.
- **Notifications**: in-app bell + browser Web Push + optional Telegram. Quiet hours (priority alerts bypass), sound toggle, grouping toggle, priority "deal" flagging.
- **Assisted checkout (Checkout Queue)**: an honest `inspecting → launched → completed/abandoned` journey toward Vinted's **real** checkout. Advisory warnings (missing image/condition, low seller rating, suspiciously low price) and an **optional, user-started local inspection stopwatch** (clearly labelled — never a Vinted reservation). See `LIMITATIONS.md` for how this maps to Vinted's genuine pending-payment behaviour.
- **Checkout launcher**: confirmation screen with item, seller, condition, estimated total, budget check, preferred-pickup reminder, explicit acknowledgment, then opens the genuine Vinted listing where Buy now lives; afterwards you report whether you bought it. It never stores cards, touches payment authentication, or simulates a purchase.
- **Delivery preferences**: multiple pickup points with name/provider/address/postcode/distance, priority ordering, enable/disable, set primary.
- **Dashboard**: Overview stats + monitor health, Live Listings, Checkout Queue, Saved Searches, Purchase History.
- **Settings**: data source, notifications, buying guardrails, review-window duration, poll interval, data retention, logs & troubleshooting.
- Dark/light mode, responsive, compact listing cards, prominent prices, availability + source badges.

---

## Quick start (local, SQLite — no setup)

```bash
# 1. Install
npm install

# 2. Create your env file
cp .env.example .env

# 3. Create the database and seed example data
npm run db:migrate
npm run db:seed        # optional: two example searches + pickup points

# 4a. Start the web app
npm run dev            # http://localhost:3000

# 4b. In a second terminal, start the monitoring worker
npm run worker
```

Open the app, go to **Overview → Check now** to run a monitor tick manually, or let the worker poll automatically. With the default **mock** adapter, new demo items appear every few checks so you can see the whole flow — detection, notifications, review countdown, buy confirmation — **completely offline**. Mock items are badged `mock` everywhere.

> If `prisma`-style engine downloads are blocked on your network, note this project uses **Drizzle + better-sqlite3**, which needs **no external binary downloads**.

---

## Enabling browser push notifications

```bash
npx web-push generate-vapid-keys
```

Put the keys in `.env`:

```env
VAPID_PUBLIC_KEY="<publicKey>"
VAPID_PRIVATE_KEY="<privateKey>"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="<publicKey>"   # same as public
VAPID_SUBJECT="mailto:you@example.com"
```

Restart, then on **Notifications** (or Settings) click **Enable push** and accept the browser prompt. Push requires HTTPS in production (localhost is exempt).

---

## Using the live (unofficial) Vinted adapter

> By switching to the live adapter you take responsibility for complying with Vinted's Terms of Service and your local laws. See `LIMITATIONS.md`.

1. In `.env`:
   ```env
   VINTED_ADAPTER="http"
   VINTED_BASE_URL="https://www.vinted.co.uk"   # your region
   VINTED_USER_AGENT="Mozilla/5.0 (compatible; VintedAssistant/1.0; personal use)"
   VINTED_COOKIE=""   # often required — see below
   ```
2. Many Vinted regions reject anonymous API calls with `401/403`. If so, obtain an **anonymous session cookie** yourself:
   - Open Vinted in your browser → DevTools → Network → reload → find a request to `/api/v2/catalog/items` → copy the `Cookie` request header → paste the value into `VINTED_COOKIE`.
   - This is your choice and your data; the app never asks for your password.
3. You can also set the adapter at runtime in **Settings → Account & connection** (the DB setting overrides the env default).
4. On each saved search you can add **Advanced catalog params (JSON)** that are forwarded verbatim, e.g. `{"catalog_ids":"79","brand_ids":"53","status_ids":"6"}`. Find these ids from the URL/network tab when you browse a filtered Vinted page.

The adapter parses defensively (Vinted's internal shape can change without notice), surfaces rate limits as backoff, and tags every listing `source: "http"`.

---

## Production: PostgreSQL + deployment

1. Provision Postgres and set:
   ```env
   DATABASE_URL="postgresql://user:pass@host:5432/vinted?schema=public"
   ```
2. Generate and apply Postgres migrations:
   ```bash
   DATABASE_URL="postgresql://..." npm run db:generate
   DATABASE_URL="postgresql://..." npm run db:migrate
   ```
   (The Drizzle schema is portable; `drizzle-kit` emits Postgres DDL automatically when `DATABASE_URL` is a `postgres://` URL. Import `@/db/pg` for the Postgres client.)
3. Build and run:
   ```bash
   npm run build
   npm start            # web
   npm run worker       # monitoring worker (separate process/service)
   ```

### Docker Compose (web + worker + Postgres)

A ready-to-use `docker-compose.yml` and `Dockerfile` are included:

```bash
docker compose up --build
```

This starts Postgres, runs migrations, serves the app on `:3000`, and runs the worker as its own service.

### Serverless / cron monitoring (no persistent worker)

If you deploy to a platform without a long-running process, you can drive monitoring with a scheduler hitting the authenticated endpoint:

```bash
curl -X POST https://your-app/api/monitor -H "x-worker-secret: $WORKER_SECRET"
```

Set `WORKER_SECRET` to a long random string. Same-origin browser requests (the "Check now" button) are also allowed.

---

## Configuration reference (`.env`)

See `.env.example` for the annotated list. Key variables: `DATABASE_URL`, `VINTED_ADAPTER`, `VINTED_BASE_URL`, `VINTED_COOKIE`, `VAPID_*`, `MONITOR_POLL_INTERVAL_SEC`, `WORKER_SECRET`.

No secrets are hardcoded. All configuration is via environment variables.

---

## Architecture

```
Next.js App Router (UI + API routes)
          │
          ├── /api/*           → JSON API (Zod-validated), Drizzle queries
          │
   src/lib/monitor.ts          → engine: fetch, filter, dedup, price drops, notify, health
   src/lib/checkout.ts         → assisted-checkout sessions + honest Vinted deep-link handoff
   src/lib/matching.ts         → pure match/filter logic (unit-tested)
   src/lib/notify.ts           → quiet hours, in-app + Web Push + Telegram fan-out
   src/lib/vinted/             → adapter interface + mock + http (unofficial) implementations
   src/worker/index.ts         → long-running poller (interval + exponential backoff)
          │
   src/db/ (Drizzle)           → SQLite (dev) / Postgres (prod), migrations in /drizzle
```

**Why this stack:** Next.js gives one deployable unit for UI + API. Drizzle + better-sqlite3 means **zero external binaries** (works on locked-down networks) and a trivial switch to Postgres. The adapter boundary keeps the risky/unofficial Vinted access isolated and swappable, and lets the entire app run and be tested offline with mock data.

---

## Testing

```bash
npm test          # vitest: matching, quiet hours, both adapters, monitor integration
npm run typecheck # tsc --noEmit
npm run lint      # next lint
```

35 tests cover the pure matching logic, quiet-hours edge cases (incl. midnight wrap), the mock adapter contract, the HTTP adapter's parsing + error handling (429/403/malformed), an **end-to-end monitor integration test** against a temp SQLite DB (detection, dedup, notification gating, filtering, health counters, and the guarantee that detection creates **no** auto-checkout), and the **assisted-checkout service** (session start/resume, optional local timer, explicit launched→completed/abandoned transitions, deep-link integrity).

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run worker` | Monitoring worker |
| `npm run db:generate` | Generate migrations from the schema |
| `npm run db:migrate` | Apply migrations (SQLite or Postgres) |
| `npm run db:seed` | Seed example data |
| `npm run db:studio` | Drizzle Studio |
| `npm test` / `npm run typecheck` / `npm run lint` | Quality gates |

---

## License

Personal use. You are responsible for how you use any unofficial data access against Vinted.
