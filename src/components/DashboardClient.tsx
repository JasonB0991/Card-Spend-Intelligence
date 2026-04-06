"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

type Transaction = {
  id: string;
  amount: number;
  merchant_raw: string | null;
  merchant_normalized: string | null;
  direction: string | null;
  ownership_type: string | null;
  note: string | null;
  is_big_spend: boolean | null;
  is_emi: boolean | null;
  is_ignored: boolean | null;
  card_last4: string | null;
  card_label: string | null;
  card_id: string | null;
  txn_date: string | null;
  product_name: string | null;
  platform_code: string | null;
  review_status: string | null;
};

type Card = {
  id: string;
  nickname: string | null;
  card_last4: string;
  is_active: boolean;
  supported_card_types?: {
    bank_name: string;
    card_name: string;
    network: string | null;
  } | null;
};

type Split = {
  id: string;
  transaction_id: string;
  person_name: string;
  amount_owed: number;
  status: string;
};

function formatCurrency(value: number) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function formatCardName(card: Card) {
  return `${card.supported_card_types?.bank_name || "Card"} ${
    card.supported_card_types?.card_name || ""
  }`.trim();
}

const donutPalette = [
  "#166534", "#15803d", "#16a34a", "#22c55e",
  "#4ade80", "#86efac", "#bbf7d0", "#dcfce7",
];

const stackedBarColors = [
  "#166534", "#15803d", "#16a34a", "#22c55e",
  "#4ade80", "#86efac", "#bbf7d0", "#dcfce7",
];
function getPlatformColor(name: string, fallback: string) {
  const normalized = name.toLowerCase();

  if (normalized.includes("zomato")) {
    return "#ef4444"; // red
  }

  if (normalized.includes("swiggy")) {
    return "#f97316"; // orange
  }

  return fallback;
}
function getCardColor(name: string, fallback: string) {
  const normalized = name.toLowerCase();

  if (normalized.includes("sbi") && normalized.includes("cashback")) {
    return "#a78bfa"; // lavender
  }

  if (normalized.includes("hdfc") && normalized.includes("swiggy")) {
    return "#f97316"; // orange
  }

  return fallback;
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm ${className}`}
    >
      <div className="px-5 pb-2 pt-5">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="px-3 pb-4">{children}</div>
    </section>
  );
}

function getAllDatesInCurrentMonth(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates: string[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dd = String(d).padStart(2, "0");
    const mm = String(month + 1).padStart(2, "0");
    dates.push(`${year}-${mm}-${dd}`);
  }

  return dates;
}

export default function DashboardClient({
  transactions,
  cards,
  splits,
}: {
  transactions: Transaction[];
  cards: Card[];
  splits: Split[];
}) {
  const [draftCards, setDraftCards] = useState<string[]>([]);
  const [draftPlatforms, setDraftPlatforms] = useState<string[]>([]);
  const [draftReviews, setDraftReviews] = useState<string[]>([]);
  const [draftShowIgnored, setDraftShowIgnored] = useState(false);

  const [appliedCards, setAppliedCards] = useState<string[]>([]);
  const [appliedPlatforms, setAppliedPlatforms] = useState<string[]>([]);
  const [appliedReviews, setAppliedReviews] = useState<string[]>([]);
  const [showIgnored, setShowIgnored] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      if (!showIgnored && txn.is_ignored) return false;
      if (
        appliedCards.length &&
        (!txn.card_id || !appliedCards.includes(txn.card_id))
      ) {
        return false;
      }
      if (
        appliedPlatforms.length &&
        !appliedPlatforms.includes(txn.platform_code || "unknown")
      ) {
        return false;
      }
      if (
        appliedReviews.length &&
        !appliedReviews.includes(txn.review_status || "needs_review")
      ) {
        return false;
      }
      return true;
    });
  }, [transactions, appliedCards, appliedPlatforms, appliedReviews, showIgnored]);

  const totalSpend = filteredTransactions.reduce(
    (sum, txn) => sum + Number(txn.amount || 0),
    0,
  );

  const needsReviewCount = filteredTransactions.filter(
    (txn) => (txn.review_status || "needs_review") === "needs_review",
  ).length;

  const pendingToCollect = splits
    .filter((s) => s.status === "pending")
    .reduce((sum, s) => sum + Number(s.amount_owed || 0), 0);

  const byCardData = useMemo(() => {
    const map = new Map<string, number>();

    for (const txn of filteredTransactions) {
      const matchedCard = cards.find((c) => c.id === txn.card_id);
      const cardName = matchedCard
  ? formatCardName(matchedCard)
  : txn.card_label || "Unknown";

      map.set(cardName, (map.get(cardName) || 0) + Number(txn.amount || 0));
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions, cards]);

  const byPlatformData = useMemo(() => {
    const map = new Map<string, number>();

    for (const txn of filteredTransactions) {
      const platform = txn.platform_code || "unknown";
      map.set(platform, (map.get(platform) || 0) + Number(txn.amount || 0));
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const byDateStackedData = useMemo(() => {
    const allDates = getAllDatesInCurrentMonth();
    const grouped = new Map<string, number[]>();

    for (const date of allDates) grouped.set(date, []);

    for (const txn of filteredTransactions) {
      if (!txn.txn_date) continue;
      const dateKey = new Date(txn.txn_date).toISOString().slice(0, 10);
      if (!grouped.has(dateKey)) continue;

      const list = grouped.get(dateKey)!;
      list.push(Number(txn.amount || 0));
      list.sort((a, b) => b - a);
    }

    const maxSegments = Math.max(
      1,
      ...Array.from(grouped.values()).map((v) => v.length),
    );

    const data = allDates.map((date) => {
      const values = grouped.get(date) || [];
      const row: Record<string, string | number> = {
        date: String(Number(date.slice(8, 10))),
      };

      for (let i = 0; i < maxSegments; i++) {
        row[`segment_${i}`] = values[i] || 0;
      }

      return row;
    });

    return { data, maxSegments };
  }, [filteredTransactions]);

  const cardOptions = useMemo(
    () => cards.map((card) => ({ value: card.id, label: formatCardName(card) })),
    [cards],
  );

  const platformOptions = Array.from(
    new Set(transactions.map((t) => t.platform_code || "unknown")),
  ).sort();

  const reviewOptions = ["needs_review", "confirmed", "rejected"];

  function toggleValue(list: string[], value: string) {
    return list.includes(value)
      ? list.filter((i) => i !== value)
      : [...list, value];
  }

  function applyFilters() {
    setAppliedCards(draftCards);
    setAppliedPlatforms(draftPlatforms);
    setAppliedReviews(draftReviews);
    setShowIgnored(draftShowIgnored);
    setIsFilterOpen(false);
  }

  function clearFilters() {
    setDraftCards([]);
    setDraftPlatforms([]);
    setDraftReviews([]);
    setDraftShowIgnored(false);

    setAppliedCards([]);
    setAppliedPlatforms([]);
    setAppliedReviews([]);
    setShowIgnored(false);
  }

  const activeFilterCount =
    appliedCards.length +
    appliedPlatforms.length +
    appliedReviews.length +
    (showIgnored ? 1 : 0);

  return (
    <div className="h-full w-full overflow-y-auto bg-[#f8faf7]">
      <div className="w-full px-6 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
              Dashboard
            </h1>
            <p className="mt-2 text-base text-slate-500">
              View spend by card, platform, and date.
            </p>
          </div>

          <div className="relative self-start">
            <button
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className="inline-flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-emerald-50"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5 text-slate-500"
              >
                <path d="M4 6h16" />
                <path d="M7 12h10" />
                <path d="M10 18h4" />
              </svg>
              Filters
              {activeFilterCount ? (
                <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
              <IconChevron open={isFilterOpen} />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 z-20 mt-3 w-[360px] max-w-[calc(100vw-2rem)] rounded-[28px] border border-emerald-100 bg-white p-5 shadow-xl">
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Platforms
                    </p>
                    <div className="mt-3 space-y-2">
                      {platformOptions.map((platform) => (
                        <label
                          key={platform}
                          className="flex items-center gap-3 rounded-2xl border border-emerald-100 px-3 py-2 text-sm text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={draftPlatforms.includes(platform)}
                            onChange={() =>
                              setDraftPlatforms((prev) =>
                                toggleValue(prev, platform),
                              )
                            }
                            className="h-4 w-4 rounded border-emerald-300"
                          />
                          <span>{platform}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Review status
                    </p>
                    <div className="mt-3 space-y-2">
                      {reviewOptions.map((status) => (
                        <label
                          key={status}
                          className="flex items-center gap-3 rounded-2xl border border-emerald-100 px-3 py-2 text-sm text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={draftReviews.includes(status)}
                            onChange={() =>
                              setDraftReviews((prev) =>
                                toggleValue(prev, status),
                              )
                            }
                            className="h-4 w-4 rounded border-emerald-300"
                          />
                          <span>{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">Cards</p>
                    <div className="mt-3 max-h-52 space-y-2 overflow-auto pr-1">
                      {cardOptions.map((card) => (
                        <label
                          key={card.value}
                          className="flex items-start gap-3 rounded-2xl border border-emerald-100 px-3 py-2 text-sm text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={draftCards.includes(card.value)}
                            onChange={() =>
                              setDraftCards((prev) =>
                                toggleValue(prev, card.value),
                              )
                            }
                            className="mt-0.5 h-4 w-4 rounded border-emerald-300"
                          />
                          <span>{card.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl border border-emerald-100 px-3 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={draftShowIgnored}
                      onChange={(e) => setDraftShowIgnored(e.target.checked)}
                      className="h-4 w-4 rounded border-emerald-300"
                    />
                    Show ignored transactions
                  </label>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <button
                    onClick={clearFilters}
                    className="rounded-full border border-emerald-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Clear all
                  </button>
                  <button
                    onClick={applyFilters}
                    className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-95"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {appliedPlatforms.map((p) => (
              <span
                key={p}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
              >
                Platform: {p}
              </span>
            ))}
            {appliedReviews.map((r) => (
              <span
                key={r}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
              >
                Review: {r}
              </span>
            ))}
            {appliedCards.map((cardId) => {
              const card = cardOptions.find((c) => c.value === cardId);
              return (
                <span
                  key={cardId}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
                >
                  Card: {card?.label || cardId}
                </span>
              );
            })}
            {showIgnored && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                Ignored shown
              </span>
            )}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Spend" value={formatCurrency(totalSpend)} />
          <StatCard label="Transactions" value={filteredTransactions.length} />
          <StatCard label="Needs Review" value={needsReviewCount} />
          <StatCard
            label="Pending To Collect"
            value={formatCurrency(pendingToCollect)}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Panel
            title="Platform-wise Spend"
            subtitle="Distribution of spend by platform"
          >
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byPlatformData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={58}
                    paddingAngle={4}
                  >
                    {byPlatformData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={getPlatformColor(entry.name, donutPalette[index % donutPalette.length])}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{
                      borderRadius: 18,
                      border: "1px solid #d1fae5",
                      boxShadow: "0 8px 30px rgba(15,23,42,0.08)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Card-wise Spend"
            subtitle="Distribution of spend by card"
          >
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCardData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={58}
                    paddingAngle={4}
                  >
                    {byCardData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={getCardColor(entry.name, donutPalette[index % donutPalette.length])}
                  />
                ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{
                      borderRadius: 18,
                      border: "1px solid #d1fae5",
                      boxShadow: "0 8px 30px rgba(15,23,42,0.08)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div className="mt-6 pb-6">
          <Panel
            title="Date-wise Expenses"
            subtitle="All days this month. Days with no spend show as zero."
          >
            <div style={{ height: 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byDateStackedData.data}
                  barCategoryGap="20%"
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    tickFormatter={(val) =>
                      Number(val) % 2 === 1 ? String(val) : ""
                    }
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip
                    labelFormatter={(label) => {
                      const now = new Date();
                      const mm = String(now.getMonth() + 1).padStart(2, "0");
                      return `${now.getFullYear()}-${mm}-${String(label).padStart(2, "0")}`;
                    }}
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{
                      borderRadius: 18,
                      border: "1px solid #d1fae5",
                      boxShadow: "0 8px 30px rgba(15,23,42,0.08)",
                    }}
                  />
                  {Array.from({ length: byDateStackedData.maxSegments }).map(
                    (_, index) => (
                      <Bar
                        key={`segment_${index}`}
                        dataKey={`segment_${index}`}
                        stackId="daily"
                        fill={stackedBarColors[index % stackedBarColors.length]}
                        radius={
                          index === byDateStackedData.maxSegments - 1
                            ? [6, 6, 0, 0]
                            : [0, 0, 0, 0]
                        }
                      />
                    ),
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}