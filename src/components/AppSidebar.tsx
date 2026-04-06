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

function IconCards() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}

type AppSidebarProps = {
  isCollapsed: boolean;
  onToggle: () => void;
};

export default function AppSidebar({
  isCollapsed,
  onToggle,
}: AppSidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: <IconDashboard /> },
    { href: "/transactions", label: "All Transactions", icon: <IconTransactions /> },
    { href: "/cards", label: "Cards", icon: <IconCards /> },
  ];

  if (isCollapsed) {
    return (
      <aside className="sticky left-0 top-0 flex h-screen w-[92px] shrink-0 flex-col items-center border-r border-emerald-100 bg-[#eef2ec] px-3 py-5">
        <button
          onClick={onToggle}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-100 bg-white text-slate-600 shadow-sm transition hover:bg-emerald-50"
          aria-label="Expand sidebar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        <nav className="mt-10 flex w-full flex-col items-center gap-2">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl transition",
                  active
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-900",
                )}
                aria-label={item.label}
                title={item.label}
              >
                <span className={active ? "text-white" : "text-slate-500"}>{item.icon}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="sticky left-0 top-0 flex h-screen w-[248px] shrink-0 flex-col border-r border-emerald-100 bg-[#eef2ec] p-5">
      <div className="flex items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-slate-950">Spendzo</p>
            <p className="text-sm text-slate-500">Spend Analytics</p>
          </div>
        </div>

        <button
          onClick={onToggle}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-white text-slate-600 transition hover:bg-emerald-50"
          aria-label="Collapse sidebar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div className="mt-10 px-2">

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