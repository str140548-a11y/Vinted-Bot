import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { createId } from "./id";

/**
 * Drizzle schema (SQLite dialect for dev; the same logical schema maps to
 * Postgres in production — see src/db/schema.pg.ts for the Postgres variant and
 * README for switching). Booleans are stored as integers (0/1), timestamps as
 * epoch-millis integers, and string arrays as JSON text, so the schema is
 * portable and dependency-light.
 */

const now = () => sql`(unixepoch() * 1000)`;

export const savedSearches = sqliteTable(
  "saved_searches",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),

    keywords: text("keywords"),
    brand: text("brand"),
    category: text("category"),
    size: text("size"),
    condition: text("condition"),
    minPrice: real("min_price"),
    maxPrice: real("max_price"),
    maxTotalCost: real("max_total_cost"),

    preferredBrands: text("preferred_brands").notNull().default("[]"),
    excludedBrands: text("excluded_brands").notNull().default("[]"),
    excludedKeywords: text("excluded_keywords").notNull().default("[]"),

    minSellerRating: real("min_seller_rating"),
    maxSellerRating: real("max_seller_rating"),

    newListingsOnly: integer("new_listings_only", { mode: "boolean" })
      .notNull()
      .default(true),
    alertPriceDrops: integer("alert_price_drops", { mode: "boolean" })
      .notNull()
      .default(false),

    notify: integer("notify", { mode: "boolean" }).notNull().default(true),
    priorityDealPct: real("priority_deal_pct"),

    rawParams: text("raw_params").notNull().default("{}"),

    lastCheckedAt: integer("last_checked_at", { mode: "timestamp_ms" }),
    lastStatus: text("last_status"),
    lastError: text("last_error"),

    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => ({ activeIdx: index("saved_searches_active_idx").on(t.active) }),
);

export const listings = sqliteTable(
  "listings",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    vintedId: text("vinted_id").notNull().unique(),
    title: text("title").notNull(),
    price: real("price").notNull(),
    currency: text("currency").notNull().default("EUR"),
    serviceFee: real("service_fee"),
    shippingFee: real("shipping_fee"),
    totalCost: real("total_cost"),
    brand: text("brand"),
    size: text("size"),
    condition: text("condition"),
    imageUrl: text("image_url"),
    url: text("url").notNull(),
    sellerName: text("seller_name"),
    sellerRating: real("seller_rating"),
    source: text("source").notNull().default("mock"),
    matchReason: text("match_reason"),
    availability: text("availability").notNull().default("available"),
    availabilityCheckedAt: integer("availability_checked_at", { mode: "timestamp_ms" }),
    firstSeenAt: integer("first_seen_at", { mode: "timestamp_ms" }).notNull().default(now()),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull().default(now()),
    savedSearchId: text("saved_search_id").references(() => savedSearches.id, {
      onDelete: "set null",
    }),
  },
  (t) => ({
    searchIdx: index("listings_search_idx").on(t.savedSearchId),
    firstSeenIdx: index("listings_first_seen_idx").on(t.firstSeenAt),
    availIdx: index("listings_avail_idx").on(t.availability),
  }),
);

export const priceHistory = sqliteTable(
  "price_history",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    price: real("price").notNull(),
    recordedAt: integer("recorded_at", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => ({ listingIdx: index("price_history_listing_idx").on(t.listingId) }),
);

export const reviewWindows = sqliteTable(
  "review_windows",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    priceAtStart: real("price_at_start").notNull(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull().default(now()),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    durationSec: integer("duration_sec").notNull().default(900),
    status: text("status").notNull().default("reviewing"),
    decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => ({
    statusIdx: index("review_windows_status_idx").on(t.status),
    expiresIdx: index("review_windows_expires_idx").on(t.expiresAt),
  }),
);

export const purchases = sqliteTable("purchases", {
  id: text("id").primaryKey().$defaultFn(createId),
  listingId: text("listing_id")
    .notNull()
    .unique()
    .references(() => listings.id, { onDelete: "cascade" }),
  recordedPrice: real("recorded_price").notNull(),
  recordedFees: real("recorded_fees"),
  recordedTotal: real("recorded_total"),
  deliveryPointName: text("delivery_point_name"),
  status: text("status").notNull().default("intended"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now()),
});

// ---------------------------------------------------------------------------
// Assisted checkout sessions.
//
// Models the user's journey to Vinted's REAL checkout. The app does NOT open
// Vinted's checkout session or create any reservation itself — that only
// happens inside Vinted when the user taps Buy now. We record the handoff and
// the user's own outcome, plus an OPTIONAL local inspection stopwatch the user
// chooses to start. No state here implies Vinted reserved the item.
// ---------------------------------------------------------------------------
export const checkoutSessions = sqliteTable(
  "checkout_sessions",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),

    priceAtStart: real("price_at_start").notNull(),
    totalAtStart: real("total_at_start"),
    deliveryPointName: text("delivery_point_name"),

    // Optional, user-started local inspection stopwatch (NOT a Vinted hold).
    inspectionStartedAt: integer("inspection_started_at", { mode: "timestamp_ms" }),
    inspectionDurationSec: integer("inspection_duration_sec"),

    // Journey state (all driven by explicit user action, never inferred from Vinted):
    //   inspecting  -> user is reviewing the listing/seller before handoff
    //   launched    -> user opened the genuine Vinted listing/checkout (new tab)
    //   completed   -> user reported they completed the purchase on Vinted
    //   abandoned   -> user decided not to buy / closed without buying
    status: text("status").notNull().default("inspecting"),
    launchedAt: integer("launched_at", { mode: "timestamp_ms" }),
    decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
    notes: text("notes"),

    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => ({
    statusIdx: index("checkout_sessions_status_idx").on(t.status),
    listingIdx: index("checkout_sessions_listing_idx").on(t.listingId),
  }),
);

export const pickupLocations = sqliteTable(
  "pickup_locations",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    provider: text("provider"),
    address: text("address"),
    postcode: text("postcode"),
    distanceKm: real("distance_km"),
    priority: integer("priority").notNull().default(0),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => ({ priorityIdx: index("pickup_locations_priority_idx").on(t.priority) }),
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    listingId: text("listing_id").references(() => listings.id, {
      onDelete: "set null",
    }),
    savedSearchId: text("saved_search_id").references(() => savedSearches.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    priority: integer("priority", { mode: "boolean" }).notNull().default(false),
    channel: text("channel").notNull().default("in_app"),
    status: text("status").notNull().default("sent"),
    error: text("error"),
    read: integer("read", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => ({
    createdIdx: index("notifications_created_idx").on(t.createdAt),
    readIdx: index("notifications_read_idx").on(t.read),
  }),
);

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey().$defaultFn(createId),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey().default("singleton"),
  quietHoursStart: text("quiet_hours_start"),
  quietHoursEnd: text("quiet_hours_end"),
  notificationSound: integer("notification_sound", { mode: "boolean" }).notNull().default(true),
  groupNotifications: integer("group_notifications", { mode: "boolean" }).notNull().default(false),
  webPushEnabled: integer("web_push_enabled", { mode: "boolean" }).notNull().default(true),
  telegramEnabled: integer("telegram_enabled", { mode: "boolean" }).notNull().default(false),
  telegramBotToken: text("telegram_bot_token"),
  telegramChatId: text("telegram_chat_id"),
  defaultMaxPrice: real("default_max_price"),
  maxTotalSpend: real("max_total_spend"),
  reviewWindowSec: integer("review_window_sec").notNull().default(900),
  quickBuyEnabled: integer("quick_buy_enabled", { mode: "boolean" }).notNull().default(false),
  requireConfirm: integer("require_confirm", { mode: "boolean" }).notNull().default(true),
  pollIntervalSec: integer("poll_interval_sec").notNull().default(60),
  dataRetentionDays: integer("data_retention_days").notNull().default(30),
  adapter: text("adapter").notNull().default("mock"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now()),
});

export const logEntries = sqliteTable(
  "log_entries",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    level: text("level").notNull().default("info"),
    scope: text("scope").notNull().default("app"),
    message: text("message").notNull(),
    meta: text("meta"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),
  },
  (t) => ({
    createdIdx: index("log_entries_created_idx").on(t.createdAt),
    levelIdx: index("log_entries_level_idx").on(t.level),
  }),
);

export const monitorHealth = sqliteTable("monitor_health", {
  id: text("id").primaryKey().default("singleton"),
  running: integer("running", { mode: "boolean" }).notNull().default(false),
  lastRunAt: integer("last_run_at", { mode: "timestamp_ms" }),
  lastSuccessAt: integer("last_success_at", { mode: "timestamp_ms" }),
  lastErrorAt: integer("last_error_at", { mode: "timestamp_ms" }),
  lastError: text("last_error"),
  consecutiveErrors: integer("consecutive_errors").notNull().default(0),
  totalChecks: integer("total_checks").notNull().default(0),
  totalMatches: integer("total_matches").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now()),
});

// Inferred types for app use.
export type SavedSearch = typeof savedSearches.$inferSelect;
export type NewSavedSearch = typeof savedSearches.$inferInsert;
export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type ReviewWindow = typeof reviewWindows.$inferSelect;
export type CheckoutSession = typeof checkoutSessions.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type PickupLocation = typeof pickupLocations.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type LogEntry = typeof logEntries.$inferSelect;
export type MonitorHealth = typeof monitorHealth.$inferSelect;
