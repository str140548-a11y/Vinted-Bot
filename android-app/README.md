# Vinted Assistant — Android app (Expo + React Native)

A real, installable **Android application** for the Vinted Assistant. It is **not** a WebView wrapper around the website — it's a native React Native app (Expo + TypeScript + Expo Router) that talks to the existing backend over its JSON API and delivers **Android push notifications** when a match is found.

The heavy lifting (monitoring engine, matching, dedup, checkout sessions, database) stays on the backend — the Next.js project in the repo root. The phone never runs a server, SQLite, or Vinted polling itself (Android can't guarantee always-on background work; see “How monitoring works”).

---

## What's here

```
android-app/
  app/                      # Expo Router screens
    _layout.tsx             # root: notification handler + tap-to-open-listing
    (tabs)/_layout.tsx      # bottom tab navigation (5 tabs)
    (tabs)/index.tsx        # Home — monitoring status, stats, quick actions
    (tabs)/searches.tsx     # Searches — create/edit/pause/duplicate/delete
    (tabs)/alerts.tsx       # Alerts — matched listings (image, price, time)
    (tabs)/checkout.tsx     # Checkout queue — assisted checkout to Vinted
    (tabs)/settings.tsx     # Settings — limits, notifications, pickup lockers
  src/
    api.ts                  # typed API client ({ok,data} envelope) + unwrap()
    push.ts                 # Expo push registration + notification tap handling
    config.ts               # resolves backend base URL (env / app.json / emulator)
    theme.ts, useTheme.ts   # dark-first theme
    components/             # Card, Button, Badge, ListingCard, forms, Countdown…
    __tests__/              # Jest tests (api, format, payload builder, component)
  app.json                  # app name, package id, icon, splash, permissions
  eas.json                  # EAS build profiles (preview = installable APK)
  assets/                   # launcher icon, adaptive icon, splash, notification icon
```

Backend additions made for the app (in the repo root `src/`):
- `POST/DELETE /api/push/expo` — register/unregister an Expo push token.
- `src/lib/expoPush.ts` — sends pushes via Expo's Push API; wired into the existing `dispatchNotification`.
- `src/middleware.ts` — CORS for `/api/*` so the app (a different origin) can call it.
- `expo_push_tokens` table + migration.

---

## 1. Run the backend first

The app needs the backend reachable over the network. From the repo root:

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed        # optional sample data
npm run dev            # http://localhost:3000
npm run worker         # monitoring worker (separate terminal)
```

For a real phone the backend must be reachable from the device — deploy it (see the root `README.md` / `docker-compose.yml`) or expose your dev machine on your LAN / via a tunnel (e.g. `ngrok http 3000`).

---

## 2. Run the app in development

```bash
cd android-app
npm install
# point the app at your backend:
cp .env.example .env     # then edit EXPO_PUBLIC_API_BASE_URL
npm run start            # opens Expo Dev Tools
```

- **Android emulator:** press `a`, and set `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000`.
- **Physical phone (dev):** install a **dev build** (below) or use Expo Go for UI-only; set the URL to your computer's LAN IP (e.g. `http://192.168.1.50:3000`). `localhost` on the phone is the phone itself.

> Push tokens require a **dev/preview/standalone build** (not Expo Go on recent SDKs). UI and API work in any mode.

---

## 3. Build an installable APK (the deliverable)

This repo is configured for **EAS Build** (Expo's cloud builder), which produces a real `.apk` without you needing Android Studio or the Android SDK locally.

### One-time setup (on your machine, needs internet + a free Expo account)

```bash
npm install -g eas-cli
eas login                       # create a free account at https://expo.dev if needed
cd android-app
eas init                        # creates/links an EAS project, writes the projectId
```

`eas init` writes your real project id. Put it in `app.json` → `expo.extra.eas.projectId`
(replace `REPLACE_WITH_YOUR_EAS_PROJECT_ID`) so push tokens work. Also set the backend URL
the build should use:

```bash
eas env:create --name EXPO_PUBLIC_API_BASE_URL --value "https://your-backend.example.com" --environment preview
# (or commit it in android-app/.env for local prebuilds)
```

### Build the APK

```bash
eas build --platform android --profile preview
```

- The `preview` profile is configured with `"buildType": "apk"` and `distribution: internal`, so you get a **directly installable APK** (not an AAB).
- When it finishes, EAS prints a URL and a QR code. Open the URL on your phone (or scan the QR) and download/install the APK. You may need to allow “Install unknown apps” for your browser.
- Alternatively: `eas build:list`, open the build, download the `.apk`, transfer via USB/cloud, and tap to install.

### Fully local build (optional, needs Android SDK)

If you prefer building locally instead of the cloud:

```bash
cd android-app
npx expo prebuild --platform android      # generates the native android/ project
cd android && ./gradlew assembleRelease   # APK at android/app/build/outputs/apk/release/
```

This requires Android SDK + JDK installed and `ANDROID_HOME` set.

---

## 4. Push notifications setup

1. Build a dev/preview/production app (Expo Go won't return a push token on recent SDKs).
2. Open **Settings → Enable push** in the app and accept the Android prompt. The app
   registers its Expo token with the backend (`POST /api/push/expo`).
3. When the backend/worker finds a match, it sends a push via Expo's Push API. Tapping it
   opens the matching Vinted listing.

For **managed/EAS builds**, Expo relays to FCM for you — **no Google/FCM key needed**.
For a **bare/standalone production** app you add your own FCM server key / service-account
in the Expo dashboard (Project → Credentials). See
https://docs.expo.dev/push-notifications/fcm-credentials/.

---

## How monitoring works (honest)

- **Monitoring runs on the backend, not the phone.** Android does not guarantee a
  continuously running background task, so the server polls and pushes to the device.
  Keep the backend `worker` running (systemd / container / a host like Render/Fly/Railway),
  or trigger `/api/monitor` from a scheduler (e.g. a cron hitting it with `x-worker-secret`).
- **Vinted has no public API.** The “live” data source is an unofficial polling adapter you
  configure on the backend; by default it runs in clearly-labelled **mock** mode. Nothing
  claims live monitoring works until you've configured and tested a permitted source.
- **Checkout is assisted only.** The app opens the genuine Vinted listing; you inspect and
  pay on Vinted. It never reserves items, never claims Vinted reserved anything, never
  bypasses 3-D Secure, and never stores Vinted credentials or card details. The optional
  15-minute timer is a **personal inspection timer**, explicitly labelled as local-only.
- **Pickup lockers** are saved as reminders for manual checkout; the app cannot select a
  locker on Vinted for you.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run start` | Expo dev server |
| `npm run android` | Open on Android emulator/device |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Jest tests |
| `eas build -p android --profile preview` | Build an installable APK (cloud) |

## Tests

`npm test` runs Jest (`jest-expo`): API envelope parsing/error handling, formatting
helpers, the saved-search payload builder, and a `ListingCard` render test. The backend's
own 39 tests (including the Expo-push send/prune logic) live in the repo root (`npm test`).
