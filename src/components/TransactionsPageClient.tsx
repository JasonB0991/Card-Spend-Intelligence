"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TransactionWorkbenchCard from "@/components/TransactionWorkbenchCard";

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
  review_note: string | null;
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
  comment?: string | null;
};

function formatCardName(card: Card) {
  return (
    card.nickname ||
    `${card.supported_card_types?.bank_name || "Card"} ${
      card.supported_card_types?.card_name || ""
    } • ${card.card_last4}`
  );
}

export default function TransactionsPageClient({
  transactions,
  cards,
  splits,
}: {
  transactions: Transaction[];
  cards: Card[];
  splits: Split[];
}) {
  const [search, setSearch] = useState("");
  const [selectedCard, setSelectedCard] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedReview, setSelectedReview] = useState("all");
  const [showIgnored, setShowIgnored] = useState(true);

  const platformOptions = Array.from(
    new Set(transactions.map((t) => t.platform_code || "unknown"))
  ).sort();

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();

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

      if (!q) return true;

      const haystack = [
        txn.product_name,
        txn.platform_code,
        txn.merchant_normalized,
        txn.merchant_raw,
        txn.card_label,
        txn.card_last4,
        txn.note,
        txn.review_note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [
    transactions,
    search,
    selectedCard,
    selectedPlatform,
    selectedReview,
    showIgnored,
  ]);

  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Transactions</h1>
            <p className="text-sm text-gray-600 mt-1">
              Review, edit, split, and confirm transactions.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className="border rounded-lg px-4 py-2">
            Dashboard
          </Link>
          <Link href="/review" className="border rounded-lg px-4 py-2">
            Review Queue
          </Link>
          <Link href="/cards" className="border rounded-lg px-4 py-2">
            Cards
          </Link>
          <Link href="/add" className="border rounded-lg px-4 py-2">
            Add Transaction
          </Link>
        </div>
      </div>

      <div className="border rounded-2xl p-4 shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block mb-1 font-medium">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Search product, merchant, card..."
            />
          </div>

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
              Show ignored
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTransactions.length === 0 ? (
          <p>No transactions for current filters.</p>
        ) : (
          filteredTransactions.map((txn) => {
            const txnSplits = splits.filter(
              (split) => split.transaction_id === txn.id
            );

            return (
              <TransactionWorkbenchCard
                key={txn.id}
                txn={txn}
                splits={txnSplits}
              />
            );
          })
        )}
      </div>
    </>
  );
}