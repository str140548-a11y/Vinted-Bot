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

### 5. The 15-minute Review Window — ✅ Honest local timer
- **Done & tested:** on detection, a review window opens with a countdown (default 15:00, configurable). You can Buy now, Keep reviewing, or Reject. On expiry it's marked expired and kept in history; you can reopen the listing.
- **Honesty:** this is a **local timer only**. Vinted has **no** delayed-purchase, reservation, or scheduled-payment mechanism for third parties. The countdown never implies the item is held or guaranteed to remain available. Advisory warnings (missing details, suspiciously low price, low seller rating) are shown but never block you.

### 6. Dashboard & data — ✅ Implemented
- Overview counts (active searches, detected today, available matches, notifications today, under review, confirmed purchases) are computed from real DB rows. Purchase "confirmed" status only ever reflects **your** manual confirmation, since the app cannot read Vinted order state.

### 7. Authentication / credentials — ✅ Safe by design
- The app **never** asks for your Vinted password. The only optional secret is an anonymous session **cookie** you choose to provide for the unofficial adapter, stored in your own `.env`. This is a single-user self-hosted tool; add real auth (e.g. a reverse proxy, Basic Auth, or an auth provider) before exposing it publicly.

---

## If an authorized integration ever becomes available
If Vinted releases an official API, OAuth, reserved-checkout, or delayed-transaction capability, the adapter boundary (`src/lib/vinted/`) is where a new, compliant provider would be added — and only its documented capabilities would be used. Until then, the honest answers above stand.
