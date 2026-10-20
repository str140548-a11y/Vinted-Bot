"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  IconDashboard,
  IconList,
  IconClock,
  IconSearch,
  IconCart,
  IconSettings,
} from "./icons";

const nav = [
  { href: "/", label: "Overview", icon: IconDashboard },
  { href: "/listings", label: "Live Listings", icon: IconList },
  { href: "/reviews", label: "Checkout Queue", icon: IconClock },
  { href: "/searches", label: "Saved Searches", icon: IconSearch },
  { href: "/purchases", label: "Purchase History", icon: IconCart },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-5 dark:border-slate-800 dark:bg-slate-900 md:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
          V
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">Vinted</div>
          <div className="text-xs text-slate-500">Assistant</div>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              <Icon width={18} height={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
        Self-hosted · single user. No automated purchases.
      </div>
    </aside>
  );
}
