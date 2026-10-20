import { and, count, eq, gte } from "drizzle-orm";
import { db, schema } from "@/db";
import { handle } from "@/lib/api";
import { getMonitorHealth, getSettings } from "@/lib/settings";
import { getAdapter } from "@/lib/vinted";
import { expireReviewWindows } from "@/lib/monitor";

export const dynamic = "force-dynamic";

/**
 * Dashboard overview stats + monitor health. This is the single source of truth
 * for the Overview cards.
 */
export async function GET() {
  return handle(async () => {
    await expireReviewWindows();
    const settings = await getSettings();
    const health = await getMonitorHealth();
    const adapter = getAdapter(settings.adapter as "mock" | "http");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [activeSearches] = await db
      .select({ c: count() })
      .from(schema.savedSearches)
      .where(eq(schema.savedSearches.active, true));

    const [detectedToday] = await db
      .select({ c: count() })
      .from(schema.listings)
      .where(gte(schema.listings.firstSeenAt, todayStart));

    const [available] = await db
      .select({ c: count() })
      .from(schema.listings)
      .where(eq(schema.listings.availability, "available"));

    const [notifsToday] = await db
      .select({ c: count() })
      .from(schema.notifications)
      .where(gte(schema.notifications.createdAt, todayStart));

    const [underReview] = await db
      .select({ c: count() })
      .from(schema.reviewWindows)
      .where(eq(schema.reviewWindows.status, "reviewing"));

    const [confirmedPurchases] = await db
      .select({ c: count() })
      .from(schema.purchases)
      .where(eq(schema.purchases.status, "confirmed"));

    const [unreadNotifs] = await db
      .select({ c: count() })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.read, false)));

    return {
      overview: {
        activeSearches: activeSearches.c,
        detectedToday: detectedToday.c,
        availableMatches: available.c,
        notificationsToday: notifsToday.c,
        underReview: underReview.c,
        confirmedPurchases: confirmedPurchases.c,
        unreadNotifications: unreadNotifs.c,
      },
      health: {
        ...health,
        adapterSource: adapter.source,
        adapterLabel: adapter.label,
      },
      settings: {
        adapter: settings.adapter,
        reviewWindowSec: settings.reviewWindowSec,
        quickBuyEnabled: settings.quickBuyEnabled,
        pollIntervalSec: settings.pollIntervalSec,
      },
    };
  });
}
