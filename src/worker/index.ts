/**
 * Monitoring worker.
 *
 * Runs the monitor tick on an interval with exponential backoff on repeated
 * failures. This is the process that actually polls the data source. Run it
 * alongside the Next.js server:
 *
 *   npm run worker
 *
 * In production, run it as a separate service (systemd, a container, a Render
 * background worker, etc.) so monitoring continues independent of web traffic.
 * On restart it resumes cleanly because all state (searches, seen listings,
 * review windows) lives in the database.
 */
import "dotenv/config";
import { env } from "@/lib/env";
import { logEvent, logger } from "@/lib/logger";
import { applyRetention, runMonitorTick } from "@/lib/monitor";
import { getSettings } from "@/lib/settings";

const BASE_INTERVAL_MS = env.monitorPollIntervalSec * 1000;
const MAX_BACKOFF_MS = 10 * 60 * 1000; // cap backoff at 10 minutes

let stopping = false;
let consecutiveFailures = 0;
let retentionCounter = 0;

function backoffMs(): number {
  if (consecutiveFailures === 0) return 0;
  const ms = Math.min(BASE_INTERVAL_MS * 2 ** consecutiveFailures, MAX_BACKOFF_MS);
  // Add jitter to avoid thundering herd.
  return ms + Math.floor(Math.random() * 1000);
}

async function loop() {
  await logEvent("info", "worker", "Monitor worker started", {
    baseIntervalSec: env.monitorPollIntervalSec,
    adapterEnv: env.vintedAdapter,
  });

  while (!stopping) {
    const settings = await getSettings().catch(() => null);
    const intervalMs = Math.max(
      30_000,
      (settings?.pollIntervalSec ?? env.monitorPollIntervalSec) * 1000,
    );

    try {
      const result = await runMonitorTick();
      const errored = result.results.some((r) => r.status === "error");
      if (errored) {
        consecutiveFailures++;
      } else {
        consecutiveFailures = 0;
      }
      const matched = result.results.reduce((a, r) => a + r.newMatches, 0);
      logger.info(
        { searches: result.searches, matched, errored },
        "Monitor tick complete",
      );

      // Run retention roughly once an hour.
      retentionCounter += 1;
      if (retentionCounter * intervalMs >= 3_600_000) {
        retentionCounter = 0;
        await applyRetention().catch((e) =>
          logEvent("warn", "worker", "Retention failed", { err: String(e) }),
        );
      }
    } catch (err) {
      consecutiveFailures++;
      await logEvent("error", "worker", "Monitor tick threw", { err: String(err) });
    }

    const wait = Math.max(intervalMs, backoffMs());
    if (consecutiveFailures > 0) {
      logger.warn({ consecutiveFailures, waitMs: wait }, "Backing off after failures");
    }
    await sleep(wait);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down monitor worker");
  stopping = true;
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

loop().catch((err) => {
  logger.error({ err }, "Worker crashed");
  process.exit(1);
});
