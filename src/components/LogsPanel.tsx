"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/client";
import { relativeTime } from "@/lib/format";
import { IconRefresh } from "./icons";

interface Log {
  id: string;
  level: string;
  scope: string;
  message: string;
  meta: string | null;
  createdAt: string;
}

export function LogsPanel() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLogs(await apiGet<Log[]>("/api/logs?limit=150"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shown = logs.filter((l) => filter === "all" || l.level === filter);

  const color: Record<string, string> = {
    info: "text-slate-500",
    warn: "text-amber-500",
    error: "text-red-500",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select className="input max-w-[140px]" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All levels</option>
          <option value="info">Info</option>
          <option value="warn">Warnings</option>
          <option value="error">Errors</option>
        </select>
        <button className="btn-secondary" onClick={load}>
          <IconRefresh width={16} height={16} /> Refresh
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs dark:border-slate-800 dark:bg-slate-950">
        {shown.length === 0 ? (
          <p className="p-2 text-slate-400">No log entries.</p>
        ) : (
          shown.map((l) => (
            <div key={l.id} className="flex gap-2 border-b border-slate-100 py-1 last:border-0 dark:border-slate-900">
              <span className="shrink-0 text-slate-400">{relativeTime(l.createdAt)}</span>
              <span className={`shrink-0 font-semibold uppercase ${color[l.level] ?? ""}`}>{l.level}</span>
              <span className="shrink-0 text-brand-600">[{l.scope}]</span>
              <span className="min-w-0 break-words">{l.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
