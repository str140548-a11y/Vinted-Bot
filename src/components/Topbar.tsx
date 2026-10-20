"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { apiGet } from "@/lib/client";
import { IconBell, IconMoon, IconSun } from "./icons";

export function Topbar() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [unread, setUnread] = useState(0);
  const [adapter, setAdapter] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const h = await apiGet<{
          overview: { unreadNotifications: number };
          health: { adapterSource: string };
        }>("/api/health");
        if (active) {
          setUnread(h.overview.unreadNotifications);
          setAdapter(h.health.adapterSource);
        }
      } catch {
        /* ignore */
      }
    };
    poll();
    const t = setInterval(poll, 10_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
          V
        </div>
        <span className="text-sm font-semibold">Vinted Assistant</span>
      </div>

      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        {adapter === "mock" && (
          <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            MOCK DATA
          </span>
        )}
        {adapter === "http" && (
          <span className="badge bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
            LIVE (unofficial)
          </span>
        )}

        <Link href="/notifications" className="btn-ghost relative" aria-label="Notifications">
          <IconBell />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>

        {mounted && (
          <button
            className="btn-ghost"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {resolvedTheme === "dark" ? <IconSun /> : <IconMoon />}
          </button>
        )}
      </div>
    </header>
  );
}
