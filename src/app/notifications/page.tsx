"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { relativeTime } from "@/lib/format";
import { PushToggle } from "@/components/PushToggle";

interface Notif {
  id: string;
  title: string;
  body: string;
  priority: boolean;
  channel: string;
  status: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);

  const load = useCallback(async () => {
    setItems(await apiGet<Notif[]>("/api/notifications?limit=80"));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const markAll = async () => {
    await apiSend("/api/notifications", "PATCH");
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Notifications</h1>
          <p className="text-sm text-slate-500">Alerts from your searches</p>
        </div>
        <button className="btn-secondary" onClick={markAll}>
          Mark all read
        </button>
      </div>

      <PushToggle />

      {items.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">No notifications yet.</div>
      ) : (
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 p-3 ${n.read ? "opacity-70" : ""}`}>
              {n.priority && (
                <span className="mt-0.5 badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                  Priority
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-sm text-slate-500">{n.body}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {relativeTime(n.createdAt)} · {n.channel}
                  {n.status !== "sent" && (
                    <span className="ml-1 text-amber-500">· {n.status.replace(/_/g, " ")}</span>
                  )}
                </p>
              </div>
              {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
