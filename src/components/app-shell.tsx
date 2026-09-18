"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store/store";
import { todayCounts } from "@/lib/selectors";

const NAV = [
  { href: "/heute", label: "Heute", icon: "◎" },
  { href: "/anrufe", label: "Anrufe", icon: "☎" },
  { href: "/anfragen", label: "Anfragen", icon: "✉" },
  { href: "/angebote", label: "Angebote", icon: "€" },
  { href: "/kunden", label: "Kunden", icon: "☺" },
  { href: "/peter", label: "Peter", icon: "✦" },
  { href: "/einstellungen", label: "Einstellungen", icon: "⚙" },
];

/** Mobil bewusst reduziert – die vier Wege, die im Alltag zählen. */
const MOBILE_NAV = NAV.filter(
  (n) => !["/einstellungen", "/kunden", "/anrufe"].includes(n.href),
);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data, ready, adapter, saving } = useStore();
  const counts = ready ? todayCounts(data) : null;
  const todayBadge = counts ? counts.newInquiries + counts.followUps + counts.callbacks : 0;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop-Navigation */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200 bg-white md:flex">
        <div className="px-5 py-6">
          <Link href="/heute" className="block">
            <div className="text-lg font-bold tracking-tight text-ink-900">Angebotsmeister</div>
            <div className="mt-0.5 truncate text-xs text-ink-400">{data.company.name}</div>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                isActive(item.href)
                  ? "bg-ink-900 text-white"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="w-4 text-center opacity-70">{item.icon}</span>
                {item.label}
              </span>
              {item.href === "/heute" && todayBadge > 0 ? (
                <span
                  className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${
                    isActive(item.href) ? "bg-white/15 text-white" : "bg-brand-50 text-brand-700"
                  }`}
                >
                  {todayBadge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="px-5 py-4 text-xs text-ink-400">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                saving ? "bg-amber-400" : "bg-emerald-500"
              }`}
            />
            {saving ? "Speichert…" : "Gespeichert"}
          </div>
          <div className="mt-1">
            {adapter === "supabase" ? "Supabase" : "Demo-Modus (dieses Gerät)"}
          </div>
        </div>
      </aside>

      {/* Mobile Kopfzeile */}
      <header className="flex items-center justify-between border-b border-ink-200 bg-white px-4 py-3 md:hidden">
        <Link href="/heute" className="text-base font-bold tracking-tight text-ink-900">
          Angebotsmeister
        </Link>
        <Link
          href="/einstellungen"
          className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-semibold text-ink-600"
        >
          ⚙
        </Link>
      </header>

      <main className="flex-1 pb-24 md:pb-0">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">{children}</div>
      </main>

      {/* Mobile Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white md:hidden">
        <div className="grid grid-cols-4">
          {MOBILE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-3 text-xs font-semibold transition ${
                isActive(item.href) ? "text-brand-600" : "text-ink-400"
              }`}
            >
              <span className="relative text-base leading-none">
                {item.icon}
                {item.href === "/heute" && todayBadge > 0 ? (
                  <span className="absolute -right-2.5 -top-1.5 rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">
                    {todayBadge}
                  </span>
                ) : null}
              </span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
