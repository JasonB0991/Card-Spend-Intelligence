"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  txn_date: string | null;
  product_name: string | null;
  platform_code: string | null;
  review_status: string | null;
  review_note: string | null;
};

export default function ReviewTransactionCard({
  txn,
}: {
  txn: Transaction;
}) {
  const router = useRouter();

  const [productName, setProductName] = useState(txn.product_name || "");
  const [platformCode, setPlatformCode] = useState(txn.platform_code || "");
  const [ownershipType, setOwnershipType] = useState(
    txn.ownership_type || "mine"
  );
  const [reviewNote, setReviewNote] = useState(txn.review_note || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function patchTransaction(payload: Record<string, unknown>) {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`/api/transactions/${txn.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update transaction");
      }

      setMessage("Saved");
      router.refresh();
    } catch (err: any) {
      setMessage(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    await patchTransaction({
      product_name: productName || null,
      platform_code: platformCode || null,
      ownership_type: ownershipType,
      review_note: reviewNote || null,
      review_status: "confirmed",
    });
  }

  async function handleReject() {
    await patchTransaction({
      review_note: reviewNote || null,
      review_status: "rejected",
    });
  }

  async function handleIgnore() {
    await patchTransaction({
      is_ignored: true,
      review_note: reviewNote || null,
      review_status: "confirmed",
    });
  }

  async function handleClearMatch() {
    await patchTransaction({
      product_name: null,
      platform_code: null,
      review_note: reviewNote || null,
      review_status: "needs_review",
    });

    try {
      await fetch(`/api/review/clear-match/${txn.id}`, {
        method: "POST",
      });
      router.refresh();
    } catch {
      // transaction update already succeeded; keep UX simple for now
    }
  }

  return (
    <div className="border rounded-2xl p-4 shadow-sm space-y-4">
      <div>
        <p className="font-semibold text-lg">
          {txn.merchant_normalized || txn.merchant_raw || "Unknown Merchant"}
        </p>
        <p>₹{txn.amount}</p>
        <p className="text-sm text-gray-500">{txn.direction}</p>

        {txn.card_label && (
          <p className="text-sm text-gray-500">
            {txn.card_label}
            {txn.card_last4 ? ` • ending ${txn.card_last4}` : ""}
          </p>
        )}

        {txn.txn_date && (
          <p className="text-sm text-gray-500">
            {new Date(txn.txn_date).toLocaleString()}
          </p>
        )}
      </div>

      <div>
        <label className="block mb-1 font-medium">Matched Product</label>
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Product name"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">Platform Code</label>
        <input
          type="text"
          value={platformCode}
          onChange={(e) => setPlatformCode(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="zomato / swiggy / amazon ..."
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">Ownership Type</label>
        <select
          value={ownershipType}
          onChange={(e) => setOwnershipType(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="mine">mine</option>
          <option value="shared">shared</option>
          <option value="not_mine">not_mine</option>
          <option value="reimbursable">reimbursable</option>
        </select>
      </div>

      <div>
        <label className="block mb-1 font-medium">Review Note</label>
        <textarea
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          rows={3}
          placeholder="Why are you editing or rejecting this match?"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="px-4 py-2 rounded-lg border"
        >
          Confirm
        </button>

        <button
          onClick={handleReject}
          disabled={loading}
          className="px-4 py-2 rounded-lg border"
        >
          Reject
        </button>

        <button
          onClick={handleIgnore}
          disabled={loading}
          className="px-4 py-2 rounded-lg border"
        >
          Ignore
        </button>

        <button
          onClick={handleClearMatch}
          disabled={loading}
          className="px-4 py-2 rounded-lg border"
        >
          Clear Match
        </button>
      </div>

      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}