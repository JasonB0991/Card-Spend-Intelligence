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
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import Link from "next/link";

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
  return (
    card.nickname ||
    `${card.supported_card_types?.bank_name || "Card"} ${
      card.supported_card_types?.card_name || ""
    } • ${card.card_last4}`
  );
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
  const [selectedCard, setSelectedCard] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedReview, setSelectedReview] = useState("all");
  const [showIgnored, setShowIgnored] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      if (!showIgnored && txn.is_ignored) return false;
      if (selectedCard !== "all" && txn.card_id !== selectedCard) return false;
      if (
        selectedPlatform !== "all" &&
        (txn.platform_code || "unknown") !== selectedPlatform
      ) {
        return false;
      }
      if (
        selectedReview !== "all" &&
        (txn.review_status || "needs_review") !== selectedReview
      ) {
        return false;
      }

      return true;
    });
  }, [transactions, selectedCard, selectedPlatform, selectedReview, showIgnored]);

  const totalSpend = filteredTransactions.reduce(
    (sum, txn) => sum + Number(txn.amount || 0),
    0
  );

  const needsReviewCount = filteredTransactions.filter(
    (txn) => (txn.review_status || "needs_review") === "needs_review"
  ).length;

  const matchedProductsCount = filteredTransactions.filter(
    (txn) => !!txn.product_name
  ).length;

  const pendingToCollect = splits
    .filter((split) => split.status === "pending")
    .reduce((sum, split) => sum + Number(split.amount_owed || 0), 0);

  const byCardData = useMemo(() => {
    const map = new Map<string, number>();

    for (const txn of filteredTransactions) {
      const matchedCard = cards.find((c) => c.id === txn.card_id);

      const cardName =
        matchedCard?.nickname ||
        (matchedCard
          ? `${matchedCard.supported_card_types?.bank_name || "Card"} ${
              matchedCard.supported_card_types?.card_name || ""
            } • ${matchedCard.card_last4}`
          : txn.card_label || txn.card_last4 || "Unknown");

      map.set(cardName, (map.get(cardName) || 0) + Number(txn.amount || 0));
    }

    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredTransactions, cards]);

  const byPlatformData = useMemo(() => {
    const map = new Map<string, number>();

    for (const txn of filteredTransactions) {
      const platform = txn.platform_code || "unmatched";
      map.set(platform, (map.get(platform) || 0) + Number(txn.amount || 0));
    }

    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredTransactions]);

  const byDateData = useMemo(() => {
    const map = new Map<string, number>();

    for (const txn of filteredTransactions) {
      const dateKey = txn.txn_date
        ? new Date(txn.txn_date).toISOString().slice(0, 10)
        : "unknown";

      map.set(dateKey, (map.get(dateKey) || 0) + Number(txn.amount || 0));
    }

    return Array.from(map.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTransactions]);

  const platformOptions = Array.from(
    new Set(transactions.map((t) => t.platform_code || "unknown"))
  ).sort();

  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Spend Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              View spend by card, platform, and date.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className="border rounded-lg px-4 py-2">
            Dashboard
          </Link>

          <Link href="/transactions" className="border rounded-lg px-4 py-2">
            View All Transactions
          </Link>

          <Link href="/review" className="border rounded-lg px-4 py-2">
            Review Queue
          </Link>

          <Link href="/cards" className="border rounded-lg px-4 py-2">
            Cards
          </Link>
          
        </div>
      </div>

      <div className="border rounded-2xl p-4 shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block mb-1 font-medium">Card</label>
            <select
              value={selectedCard}
              onChange={(e) => setSelectedCard(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="all">All cards</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {formatCardName(card)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Platform</label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="all">All platforms</option>
              {platformOptions.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Review Status</label>
            <select
              value={selectedReview}
              onChange={(e) => setSelectedReview(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="all">All</option>
              <option value="needs_review">needs_review</option>
              <option value="confirmed">confirmed</option>
              <option value="rejected">rejected</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showIgnored}
                onChange={(e) => setShowIgnored(e.target.checked)}
              />
              Show ignored transactions
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="border rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Spend</p>
          <p className="text-2xl font-semibold">{formatCurrency(totalSpend)}</p>
        </div>

        <div className="border rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Transactions</p>
          <p className="text-2xl font-semibold">
            {filteredTransactions.length}
          </p>
        </div>

        <div className="border rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Needs Review</p>
          <p className="text-2xl font-semibold">{needsReviewCount}</p>
        </div>

        <div className="border rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Pending To Collect</p>
          <p className="text-2xl font-semibold">
            {formatCurrency(pendingToCollect)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="border rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Matched Products</p>
          <p className="text-2xl font-semibold">{matchedProductsCount}</p>
        </div>

        <div className="border rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Active Cards</p>
          <p className="text-2xl font-semibold">
            {cards.filter((card) => card.is_active).length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className="border rounded-2xl p-4 shadow-sm h-[360px]">
          <h2 className="text-lg font-semibold mb-4">Spend by Card</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCardData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="border rounded-2xl p-4 shadow-sm h-[360px]">
          <h2 className="text-lg font-semibold mb-4">Spend by Platform</h2>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={byPlatformData}
                dataKey="value"
                nameKey="name"
                outerRadius={110}
                label
              >
                {byPlatformData.map((_, index) => (
                  <Cell key={index} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="border rounded-2xl p-4 shadow-sm h-[360px] mb-8">
        <h2 className="text-lg font-semibold mb-4">Spend by Date</h2>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={byDateData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
            <Line type="monotone" dataKey="value" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}