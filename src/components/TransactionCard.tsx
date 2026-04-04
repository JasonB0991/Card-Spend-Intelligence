"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SplitRow from "./SplitRow";

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
  txn_date: string | null;
  product_name: string | null;
  platform_code: string | null; 
};

export default function TransactionCard({
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
  });

  const [splitForm, setSplitForm] = useState({
    person_name: "",
    amount_owed: "",
    status: "pending",
    comment: "",
  });

  const [loading, setLoading] = useState(false);
  const [splitLoading, setSplitLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [splitError, setSplitError] = useState("");

  function updateField(name: string, value: string | boolean) {
    setSaved(false);
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    setLoading(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch(`/api/transactions/${txn.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update transaction");
      }

      setSaved(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSplit() {
    setSplitLoading(true);
    setSplitError("");

    try {
      const res = await fetch("/api/splits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      router.refresh();
    } catch (err: any) {
      setSplitError(err.message || "Something went wrong");
    } finally {
      setSplitLoading(false);
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
      {txn.product_name && (
        <p className="text-sm font-medium text-gray-700">
          Product: {txn.product_name}
        </p>
      )}

      {txn.platform_code && (
        <p className="text-sm text-gray-500">
          Platform: {txn.platform_code}
        </p>
      )}
      {txn.txn_date && (
        <p className="text-sm text-gray-500">
          {new Date(txn.txn_date).toLocaleString()}
        </p>
      )}
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
        <label className="block mb-1 font-medium">Note</label>
        <textarea
          value={form.note}
          onChange={(e) => updateField("note", e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          rows={3}
        />
      </div>

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

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 rounded-lg border"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>

        {saved && <p className="text-sm text-green-600">Saved</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-3">Splits</h3>

        <div className="space-y-2 mb-4">
          {splits.length === 0 ? (
            <p className="text-sm text-gray-500">No splits yet.</p>
          ) : (
            splits.map((split) => (
                <SplitRow key={split.id} split={split} />
                ))
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

          {splitError && <p className="text-sm text-red-600">{splitError}</p>}
        </div>
      </div>
    </div>
  );
}