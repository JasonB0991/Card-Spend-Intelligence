"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SplitRow from "@/components/SplitRow";

type Split = {
  id: string;
  transaction_id: string;
  person_name: string;
  amount_owed: number;
  status: string;
  comment: string | null;
};

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
function formatPlatformName(code: string | null | undefined) {
  if (!code) return null;

  const map: Record<string, string> = {
    swiggy: "Swiggy",
    swiggy_instamart: "Swiggy Instamart",
    zomato: "Zomato",
    amazon: "Amazon",
    flipkart: "Flipkart",
    uber: "Uber",
    zepto: "Zepto",
  };

  return map[code] || code.replaceAll("_", " ");
}

export default function TransactionWorkbenchCard({
  txn,
  splits,
}: {
  txn: Transaction;
  splits: Split[];
}) {
  const router = useRouter();

  const [form, setForm] = useState({
    ownership_type: txn.ownership_type || "mine",
    note: txn.note || "",
    is_big_spend: !!txn.is_big_spend,
    is_emi: !!txn.is_emi,
    is_ignored: !!txn.is_ignored,
    product_name: txn.product_name || "",
    platform_code: txn.platform_code || "",
    review_status: txn.review_status || "needs_review",
    review_note: txn.review_note || "",
  });

  const [splitForm, setSplitForm] = useState({
    person_name: "",
    amount_owed: "",
    status: "pending",
    comment: "",
  });

  const [loading, setLoading] = useState(false);
  const [splitLoading, setSplitLoading] = useState(false);
  const [message, setMessage] = useState("");

  function updateField(name: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

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

  async function handleSave() {
    await patchTransaction(form);
  }

  async function handleConfirm() {
    await patchTransaction({
      ...form,
      review_status: "confirmed",
    });
  }

  async function handleReject() {
    await patchTransaction({
      review_status: "rejected",
      review_note: form.review_note || null,
    });
  }

  async function handleClearMatch() {
    await patchTransaction({
      product_name: null,
      platform_code: null,
      review_status: "needs_review",
      review_note: form.review_note || null,
    });

    try {
      await fetch(`/api/review/clear-match/${txn.id}`, {
        method: "POST",
      });
      router.refresh();
    } catch {
      // ignore
    }
  }

  async function handleAddSplit() {
    setSplitLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/splits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_id: txn.id,
          person_name: splitForm.person_name,
          amount_owed: Number(splitForm.amount_owed),
          status: splitForm.status,
          comment: splitForm.comment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add split");
      }

      setSplitForm({
        person_name: "",
        amount_owed: "",
        status: "pending",
        comment: "",
      });

      setMessage("Split added");
      router.refresh();
    } catch (err: any) {
      setMessage(err.message || "Something went wrong");
    } finally {
      setSplitLoading(false);
    }
  }

  return (
    <div className="border rounded-2xl p-4 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-semibold text-lg">
            {txn.platform_code
                ? txn.platform_code.replaceAll("_", " ").toUpperCase()
                : txn.merchant_normalized || txn.merchant_raw || "Unknown"}
            </p>

            {txn.product_name && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {txn.product_name}
            </p>
            )}
          <p>₹{txn.amount}</p>
          <div className="text-sm text-gray-500 space-y-1 mt-1">
            {txn.platform_code && <p>Platform: {txn.platform_code}</p>}
            {txn.card_label && (
              <p>
                Card: {txn.card_label}
                {txn.card_last4 ? ` • ending ${txn.card_last4}` : ""}
              </p>
            )}
            {txn.txn_date && (
              <p>{new Date(txn.txn_date).toLocaleString()}</p>
            )}
            <p>Review: {form.review_status}</p>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          {txn.direction && <p>{txn.direction}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-medium">Product Name</label>
          <input
            type="text"
            value={form.product_name}
            onChange={(e) => updateField("product_name", e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Chicken 65 from Raasa Cafe"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Platform Code</label>
          <input
            type="text"
            value={form.platform_code}
            onChange={(e) => updateField("platform_code", e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="zomato / swiggy / amazon"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Ownership Type</label>
          <select
            value={form.ownership_type}
            onChange={(e) => updateField("ownership_type", e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="mine">mine</option>
            <option value="shared">shared</option>
            <option value="not_mine">not_mine</option>
            <option value="reimbursable">reimbursable</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium">Review Status</label>
          <select
            value={form.review_status}
            onChange={(e) => updateField("review_status", e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="needs_review">needs_review</option>
            <option value="confirmed">confirmed</option>
            <option value="rejected">rejected</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block mb-1 font-medium">Note</label>
          <textarea
            value={form.note}
            onChange={(e) => updateField("note", e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            rows={2}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block mb-1 font-medium">Review Note</label>
          <textarea
            value={form.review_note}
            onChange={(e) => updateField("review_note", e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            rows={2}
            placeholder="Why you changed or rejected this transaction"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_big_spend}
            onChange={(e) => updateField("is_big_spend", e.target.checked)}
          />
          Big spend
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_emi}
            onChange={(e) => updateField("is_emi", e.target.checked)}
          />
          EMI
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_ignored}
            onChange={(e) => updateField("is_ignored", e.target.checked)}
          />
          Ignored
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 rounded-lg border"
        >
          {loading ? "Saving..." : "Save"}
        </button>

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
          onClick={handleClearMatch}
          disabled={loading}
          className="px-4 py-2 rounded-lg border"
        >
          Clear Match
        </button>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-3">Splits</h3>

        <div className="space-y-3 mb-4">
          {splits.length === 0 ? (
            <p className="text-sm text-gray-500">No splits yet.</p>
          ) : (
            splits.map((split) => <SplitRow key={split.id} split={split} />)
          )}
        </div>

        <div className="space-y-3 border rounded-xl p-3">
          <input
            type="text"
            placeholder="Person name"
            value={splitForm.person_name}
            onChange={(e) =>
              setSplitForm((prev) => ({ ...prev, person_name: e.target.value }))
            }
            className="w-full border rounded-lg px-3 py-2"
          />

          <input
            type="number"
            step="0.01"
            placeholder="Amount owed"
            value={splitForm.amount_owed}
            onChange={(e) =>
              setSplitForm((prev) => ({ ...prev, amount_owed: e.target.value }))
            }
            className="w-full border rounded-lg px-3 py-2"
          />

          <select
            value={splitForm.status}
            onChange={(e) =>
              setSplitForm((prev) => ({ ...prev, status: e.target.value }))
            }
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="pending">pending</option>
            <option value="collected">collected</option>
            <option value="waived">waived</option>
          </select>

          <textarea
            placeholder="Comment"
            value={splitForm.comment}
            onChange={(e) =>
              setSplitForm((prev) => ({ ...prev, comment: e.target.value }))
            }
            className="w-full border rounded-lg px-3 py-2"
            rows={2}
          />

          <button
            onClick={handleAddSplit}
            disabled={splitLoading}
            className="px-4 py-2 rounded-lg border"
          >
            {splitLoading ? "Adding..." : "Add Split"}
          </button>
        </div>
      </div>

      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}