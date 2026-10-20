import { z } from "zod";

export const CONDITIONS = [
  "new_with_tags",
  "new_without_tags",
  "very_good",
  "good",
  "satisfactory",
] as const;

const jsonStringArray = z
  .array(z.string().trim().min(1))
  .default([]);

/** Base object schema (allows .partial() for PATCH). */
export const savedSearchBase = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    active: z.boolean().default(true),
    keywords: z.string().trim().max(300).optional().nullable(),
    brand: z.string().trim().max(120).optional().nullable(),
    category: z.string().trim().max(120).optional().nullable(),
    size: z.string().trim().max(60).optional().nullable(),
    condition: z.enum(CONDITIONS).optional().nullable(),
    minPrice: z.number().nonnegative().optional().nullable(),
    maxPrice: z.number().nonnegative().optional().nullable(),
    maxTotalCost: z.number().nonnegative().optional().nullable(),
    preferredBrands: jsonStringArray,
    excludedBrands: jsonStringArray,
    excludedKeywords: jsonStringArray,
    minSellerRating: z.number().min(0).max(5).optional().nullable(),
    maxSellerRating: z.number().min(0).max(5).optional().nullable(),
    newListingsOnly: z.boolean().default(true),
    alertPriceDrops: z.boolean().default(false),
    notify: z.boolean().default(true),
    priorityDealPct: z.number().min(0).max(1).optional().nullable(),
    rawParams: z.record(z.string(), z.string()).default({}),
  });

/** Full create schema (adds the cross-field price check). */
export const savedSearchInput = savedSearchBase.refine(
  (v) => v.minPrice == null || v.maxPrice == null || v.minPrice <= v.maxPrice,
  { message: "minPrice must be <= maxPrice", path: ["minPrice"] },
);

export type SavedSearchInput = z.infer<typeof savedSearchInput>;

export const pickupLocationInput = z.object({
  name: z.string().trim().min(1).max(120),
  provider: z.string().trim().max(60).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  postcode: z.string().trim().max(20).optional().nullable(),
  distanceKm: z.number().nonnegative().optional().nullable(),
  priority: z.number().int().min(0).default(0),
  enabled: z.boolean().default(true),
  isPrimary: z.boolean().default(false),
});
export type PickupLocationInput = z.infer<typeof pickupLocationInput>;

export const settingsInput = z.object({
  quietHoursStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Use HH:MM")
    .optional()
    .nullable(),
  quietHoursEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Use HH:MM")
    .optional()
    .nullable(),
  notificationSound: z.boolean().optional(),
  groupNotifications: z.boolean().optional(),
  webPushEnabled: z.boolean().optional(),
  telegramEnabled: z.boolean().optional(),
  telegramBotToken: z.string().trim().max(200).optional().nullable(),
  telegramChatId: z.string().trim().max(100).optional().nullable(),
  defaultMaxPrice: z.number().nonnegative().optional().nullable(),
  maxTotalSpend: z.number().nonnegative().optional().nullable(),
  reviewWindowSec: z.number().int().min(30).max(3600).optional(),
  quickBuyEnabled: z.boolean().optional(),
  requireConfirm: z.boolean().optional(),
  pollIntervalSec: z.number().int().min(30).max(3600).optional(),
  dataRetentionDays: z.number().int().min(1).max(3650).optional(),
  adapter: z.enum(["mock", "http"]).optional(),
});
export type SettingsInput = z.infer<typeof settingsInput>;

export const pushSubscriptionInput = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().optional().nullable(),
});

export const purchaseInput = z.object({
  listingId: z.string().min(1),
  deliveryPointName: z.string().max(200).optional().nullable(),
  status: z.enum(["intended", "confirmed", "abandoned"]).default("intended"),
});
