/**
 * Types mirroring the backend API response shapes (see the Next.js repo's
 * src/db/schema.ts and API routes). Timestamps arrive as ISO strings or epoch
 * numbers over JSON; we accept both.
 */
export type Timestampish = string | number | null;

export interface HealthResponse {
  overview: {
    activeSearches: number;
    detectedToday: number;
    availableMatches: number;
    notificationsToday: number;
    underReview: number;
    confirmedPurchases: number;
    unreadNotifications: number;
  };
  health: {
    running: boolean;
    lastRunAt: Timestampish;
    lastSuccessAt: Timestampish;
    lastErrorAt: Timestampish;
    lastError: string | null;
    consecutiveErrors: number;
    totalChecks: number;
    totalMatches: number;
    adapterSource: "mock" | "http";
    adapterLabel: string;
  };
  settings: {
    adapter: "mock" | "http";
    reviewWindowSec: number;
    quickBuyEnabled: boolean;
    pollIntervalSec: number;
  };
}

export interface SavedSearch {
  id: string;
  name: string;
  active: boolean;
  keywords: string | null;
  brand: string | null;
  category: string | null;
  size: string | null;
  condition: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  maxTotalCost: number | null;
  preferredBrands: string;
  excludedBrands: string;
  excludedKeywords: string;
  minSellerRating: number | null;
  maxSellerRating: number | null;
  newListingsOnly: boolean;
  alertPriceDrops: boolean;
  notify: boolean;
  priorityDealPct: number | null;
  rawParams: string;
  lastCheckedAt: Timestampish;
  lastStatus: string | null;
  lastError: string | null;
}

export interface Listing {
  id: string;
  vintedId: string;
  title: string;
  price: number;
  currency: string;
  serviceFee: number | null;
  shippingFee: number | null;
  totalCost: number | null;
  brand: string | null;
  size: string | null;
  condition: string | null;
  imageUrl: string | null;
  url: string;
  sellerName: string | null;
  sellerRating: number | null;
  source: "mock" | "http";
  matchReason: string | null;
  availability: string;
  firstSeenAt: Timestampish;
}

export interface CheckoutSession {
  id: string;
  status: "inspecting" | "launched" | "completed" | "abandoned";
  priceAtStart: number;
  totalAtStart: number | null;
  deliveryPointName: string | null;
  inspectionStartedAt: Timestampish;
  inspectionDurationSec: number | null;
  launchedAt: Timestampish;
  createdAt: Timestampish;
  listing: Listing;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  priority: boolean;
  channel: string;
  status: string;
  read: boolean;
  createdAt: Timestampish;
}

export interface PickupLocation {
  id: string;
  name: string;
  provider: string | null;
  address: string | null;
  postcode: string | null;
  distanceKm: number | null;
  priority: number;
  enabled: boolean;
  isPrimary: boolean;
}

export interface AppSettings {
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  notificationSound: boolean;
  groupNotifications: boolean;
  defaultMaxPrice: number | null;
  maxTotalSpend: number | null;
  reviewWindowSec: number;
  quickBuyEnabled: boolean;
  requireConfirm: boolean;
  pollIntervalSec: number;
  dataRetentionDays: number;
  adapter: "mock" | "http";
}
