# Honest technical limitations

This document explains, feature by feature, what is genuinely implemented, what requires your configuration, what is limited by Vinted's platform, and what is intentionally **not** done because it isn't possible safely/legally. This is deliberately candid — the goal is a genuinely useful tool, not an impressive-looking facade.

## The core constraint: Vinted has no public API

Vinted does **not** offer a documented, authorized public API, OAuth program, or partner integration for consumer-side listing monitoring or purchasing. Everything a third party can do is based on the **internal JSON endpoints the Vinted website calls itself** (e.g. `GET /api/v2/catalog/items`). Those are:

- Undocumented and unstable (shape/params can change without notice).
- Rate-limited and often require an anonymous session cookie.
- Not intended for automated/bulk use — doing so **may violate Vinted's Terms of Service**.

Because of this, the app is built around a **swappable adapter**:

- **`mock`** (default): deterministic fake data so the whole app runs and is testable offline. Clearly labeled `mock` in the UI. **Never presented as live.**
- **`http`**: the unofficial polling adapter. **You** enable it and supply any cookie. You own the ToS decision.

---

## Feature-by-feature status

### 1. Instant listing monitoring — ⚙️ Implemented, latency-limited
- **Done & tested:** saved-search config (all fields), fetch→filter→dedup (unique Vinted id), first-seen timestamps, price-drop detection, per-search last-check/status, error/rate-limit handling with exponential backoff, restart resilience (all state in DB), health heartbeat.
- **Limit:** "Instant" is bounded by your poll interval (default 60s, min 30s). There is **no real-time push** available to third parties. Setting the interval very low increases the chance of rate-limiting/blocking.

### 2. Instant notifications — ✅ Implemented
- **Done & tested:** in-app notifications + log, quiet hours (priority bypass), priority deal flagging, grouping/sound toggles, notification records with status.
- **Requires config:** Web Push needs VAPID keys (`npx web-push generate-vapid-keys`). Telegram needs a bot token + chat id.
- Notification payloads include image, title, price, fees (when known), seller + rating (when known), condition, first-seen time, match reason, and a direct link.

### 3. Quick Buy — 🚫 No automated checkout (by design)
- There is **no authorized Vinted checkout API** for third parties. Automating checkout would require replaying your logged-in session/payment flow, which violates ToS and is unsafe.
- **What's done:** a confirmation screen (item, seller, condition, estimated total, budget guardrail, preferred-pickup reminder, explicit acknowledgment) that records a local purchase **intent** and opens the **genuine Vinted listing** in a new tab for you to complete.
- **Never:** simulates a purchase, stores card details, or claims a purchase happened.

### 4. Preferred pickup lockers — ⚙️ Preferences only
- **Done:** store multiple pickup points (name, provider, address, postcode, distance, priority), reorder, enable/disable, set primary.
- **Limit:** there is no public Vinted/locker directory API, so locations are entered manually, and the app **cannot select a locker on Vinted for you**. At checkout we show your primary point as a reminder. Locker availability depends on the seller/parcel/method and is decided by Vinted per order.

### 5. Assisted checkout & Vinted's pending-payment hold — ⚙️ Assisted, with hard limits

This replaces the earlier "auto-starting 15-minute Review Window". It is the result of investigating Vinted's **actual** checkout/reservation behaviour.

**What Vinted actually does (three separate mechanisms — don't conflate them):**
1. **"Reserve item"** ([Vinted Help: Reserving an item](https://www.vinted.com/help/59-reserving-an-item)) is a **seller** action for a specific buyer. A buyer or third-party tool cannot trigger it. Not relevant here.
2. **Pending-payment state.** When a buyer taps **Buy now** and enters Vinted's real checkout, the item goes into a transient "in progress" state so two people don't both pay; another buyer opening it may be told it's part of another transaction. Crucially this is a **side effect of a genuine checkout being open** — not a reservation you can create, extend, or rely on. Its exact duration/guarantee is **Vinted's, undocumented, and varies** (Vinted itself notes payment-processing timings can range widely). We therefore **never assume a fixed 15-minute hold**.
3. **Payment authentication (3DS/SCA).** The final pay step runs between **you, Vinted's payment processor, and your bank**. No third party may sit in or bypass it.

**What this app does (assisted checkout):**
- Records your checkout journey: `inspecting → launched → completed / abandoned` — every transition is an explicit **user action**, never inferred from Vinted.
- Builds the fastest honest handoff: a deep link to the **genuine listing** where Buy now lives (`buildCheckoutDeepLink`). Tapping Buy now **there** is what makes Vinted create its real pending hold.
- Offers an **optional, user-started local inspection stopwatch**. It is clearly labelled "local only — Vinted has NOT reserved this item" and is never auto-started on detection.
- Shows total cost, a budget guardrail, your preferred pickup reminder, and advisory warnings (missing details, suspiciously low price, low seller rating) — none blocking.

**What this app cannot / will not do:**
- ❌ Open Vinted's checkout session for you (no public API; automating the authenticated flow violates ToS).
- ❌ Create, extend, measure, or guarantee the pending-payment hold.
- ❌ Enter or bypass payment authentication (3DS).
- ❌ Store/replay payment credentials or simulate a completed purchase.

**Per-requirement verdict** (your six points): detect match → ✅; open genuine checkout ASAP → ⚙️ assisted deep-link only; inspect before confirming → ✅ (but **not** inside the bank's 3DS screen); let Vinted handle the real hold → ✅ (that's exactly the model); complete/abandon on your decision → ✅ (you do it on Vinted, app records outcome); preferred pickup → ⚙️ reminder only.

### 6. Dashboard & data — ✅ Implemented
- Overview counts (active searches, detected today, available matches, notifications today, under review, confirmed purchases) are computed from real DB rows. Purchase "confirmed" status only ever reflects **your** manual confirmation, since the app cannot read Vinted order state.

### 7. Authentication / credentials — ✅ Safe by design
- The app **never** asks for your Vinted password. The only optional secret is an anonymous session **cookie** you choose to provide for the unofficial adapter, stored in your own `.env`. This is a single-user self-hosted tool; add real auth (e.g. a reverse proxy, Basic Auth, or an auth provider) before exposing it publicly.

---

## If an authorized integration ever becomes available
If Vinted releases an official API, OAuth, reserved-checkout, or delayed-transaction capability, the adapter boundary (`src/lib/vinted/`) is where a new, compliant provider would be added — and only its documented capabilities would be used. Until then, the honest answers above stand.
