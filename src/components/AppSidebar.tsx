"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6Zm10-10h8V3h-8v8Z" />
    </svg>
  );
}

function IconTransactions() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M7 7h11" />
      <path d="M7 12h8" />
      <path d="M7 17h6" />
      <path d="M4 7h.01" />
      <path d="M4 12h.01" />
      <path d="M4 17h.01" />
    </svg>
  );
}

function IconReview() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M9 11l2 2 4-4" />
      <path d="M21 12c0 4.97-4.03 9-9 9a9 9 0 1 1 9-9Z" />
    </svg>
  );
}

function IconCards() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}

export default function AppSidebar() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: <IconDashboard /> },
    { href: "/transactions", label: "All Transactions", icon: <IconTransactions /> },
    { href: "/cards", label: "Cards", icon: <IconCards /> },
  ];

  return (
    <aside className="sticky left-0 top-0 flex h-screen w-[248px] shrink-0 flex-col border-r border-emerald-100 bg-[#eef2ec] p-5">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-lg font-bold text-white shadow-sm">
          ₹
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight text-slate-950">Spendzo</p>
          <p className="text-sm text-slate-500">Analytics workspace</p>
        </div>
      </div>

      <div className="mt-10 px-2">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Overview
        </p>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  active
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-900",
                )}
              >
                <span className={active ? "text-white" : "text-slate-500"}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
