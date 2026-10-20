"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { DeliveryPrefs } from "@/components/DeliveryPrefs";
import { LogsPanel } from "@/components/LogsPanel";
import { PushToggle } from "@/components/PushToggle";

interface Settings {
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  notificationSound: boolean;
  groupNotifications: boolean;
  webPushEnabled: boolean;
  telegramEnabled: boolean;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  defaultMaxPrice: number | null;
  maxTotalSpend: number | null;
  reviewWindowSec: number;
  quickBuyEnabled: boolean;
  requireConfirm: boolean;
  pollIntervalSec: number;
  dataRetentionDays: number;
  adapter: "mock" | "http";
  _capabilities: {
    webPushConfigured: boolean;
    adapterEnv: string;
    vintedBaseUrl: string;
    cookieConfigured: boolean;
  };
}

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setS(await apiGet<Settings>("/api/settings"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (partial: Record<string, unknown>) => {
    await apiSend("/api/settings", "PATCH", partial);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    await load();
  };

  if (!s) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-slate-500">Configure monitoring, notifications and buying</p>
        </div>
        {saved && <span className="badge bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300">Saved ✓</span>}
      </div>

      {/* Connection / account */}
      <Section title="Account & connection" desc="This is a self-hosted, single-user app. Credentials are never stored here.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Row label="Data source">
            <select
              className="input"
              value={s.adapter}
              onChange={(e) => patch({ adapter: e.target.value })}
            >
              <option value="mock">Mock (offline demo — labeled, not live)</option>
              <option value="http">Live polling (unofficial — your responsibility)</option>
            </select>
          </Row>
          <Row label="Vinted base URL (from env)">
            <input className="input" value={s._capabilities.vintedBaseUrl} disabled />
          </Row>
        </div>
        <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/60">
          <p>
            <strong>Live adapter status:</strong>{" "}
            {s._capabilities.cookieConfigured
              ? "Session cookie configured in env."
              : "No session cookie set — many Vinted regions require one (set VINTED_COOKIE). See README."}
          </p>
          <p className="mt-1">
            We never ask for your Vinted password. Switching to Live polling uses Vinted&apos;s internal
            endpoint, which is unofficial and may violate their Terms — you accept that responsibility.
          </p>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notification preferences">
        <PushToggle />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Row label="Quiet hours start (HH:MM)">
            <input className="input" placeholder="22:00" defaultValue={s.quietHoursStart ?? ""} onBlur={(e) => patch({ quietHoursStart: e.target.value || null })} />
          </Row>
          <Row label="Quiet hours end (HH:MM)">
            <input className="input" placeholder="08:00" defaultValue={s.quietHoursEnd ?? ""} onBlur={(e) => patch({ quietHoursEnd: e.target.value || null })} />
          </Row>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <Check label="Notification sound" checked={s.notificationSound} onChange={(v) => patch({ notificationSound: v })} />
          <Check label="Group notifications" checked={s.groupNotifications} onChange={(v) => patch({ groupNotifications: v })} />
          <Check label="Web push enabled" checked={s.webPushEnabled} onChange={(v) => patch({ webPushEnabled: v })} />
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Check label="Enable Telegram notifications" checked={s.telegramEnabled} onChange={(v) => patch({ telegramEnabled: v })} />
          {s.telegramEnabled && (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Row label="Bot token">
                <input className="input" placeholder="123456:ABC-DEF…" onBlur={(e) => e.target.value && patch({ telegramBotToken: e.target.value })} />
              </Row>
              <Row label="Chat ID">
                <input className="input" defaultValue={s.telegramChatId ?? ""} onBlur={(e) => patch({ telegramChatId: e.target.value || null })} />
              </Row>
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Create a bot with @BotFather, then message it and use your chat id.</p>
        </div>
      </Section>

      {/* Buying */}
      <Section title="Buying & review" desc="The app never completes a purchase. These are your defaults and guardrails.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Row label="Default max price">
            <input className="input" type="number" defaultValue={s.defaultMaxPrice ?? ""} onBlur={(e) => patch({ defaultMaxPrice: e.target.value ? Number(e.target.value) : null })} />
          </Row>
          <Row label="Max total spend">
            <input className="input" type="number" defaultValue={s.maxTotalSpend ?? ""} onBlur={(e) => patch({ maxTotalSpend: e.target.value ? Number(e.target.value) : null })} />
          </Row>
          <Row label="Inspection timer (minutes, local only)">
            <input
              className="input"
              type="number"
              min={1}
              max={60}
              defaultValue={Math.round(s.reviewWindowSec / 60)}
              onBlur={(e) => patch({ reviewWindowSec: Math.max(30, Number(e.target.value) * 60) })}
            />
          </Row>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <Check label="Enable Quick Buy (opens Vinted faster)" checked={s.quickBuyEnabled} onChange={(v) => patch({ quickBuyEnabled: v })} />
          <Check label="Require confirmation before opening checkout" checked={s.requireConfirm} onChange={(v) => patch({ requireConfirm: v })} />
        </div>
      </Section>

      {/* Monitoring */}
      <Section title="Monitoring" desc="Poll cadence is the lower bound on alert latency with the unofficial adapter.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Row label="Poll interval (seconds, min 30)">
            <input className="input" type="number" min={30} defaultValue={s.pollIntervalSec} onBlur={(e) => patch({ pollIntervalSec: Math.max(30, Number(e.target.value)) })} />
          </Row>
          <Row label="Data retention (days)">
            <input className="input" type="number" min={1} defaultValue={s.dataRetentionDays} onBlur={(e) => patch({ dataRetentionDays: Math.max(1, Number(e.target.value)) })} />
          </Row>
        </div>
      </Section>

      {/* Delivery */}
      <Section title="Delivery preferences" desc="Saved pickup points surfaced at checkout as reminders. The app can't select lockers on Vinted for you.">
        <DeliveryPrefs />
      </Section>

      {/* Logs */}
      <Section title="Logs & troubleshooting">
        <LogsPanel />
      </Section>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {desc && <p className="mb-3 mt-0.5 text-xs text-slate-500">{desc}</p>}
      <div className={desc ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
