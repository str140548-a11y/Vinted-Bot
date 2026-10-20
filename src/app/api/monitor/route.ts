import type { NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/api";
import { env } from "@/lib/env";
import { runMonitorTick } from "@/lib/monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Trigger one monitor tick on demand. Used by:
 *   - the dashboard "Check now" button (same-origin, allowed)
 *   - an external cron/scheduler (must send x-worker-secret header)
 *
 * The long-running `npm run worker` is the primary driver; this endpoint lets
 * you also run serverless/cron-based monitoring (e.g. Vercel Cron) without a
 * persistent worker.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const secret = req.headers.get("x-worker-secret");
    const sameOrigin =
      req.headers.get("sec-fetch-site") === "same-origin" ||
      req.headers.get("origin") === null;

    // Allow if same-origin (browser button) OR the shared secret matches.
    if (!sameOrigin && secret !== env.workerSecret) {
      throw new HttpError("Unauthorized", 401);
    }

    const result = await runMonitorTick();
    return result;
  });
}
