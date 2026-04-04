"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddTransactionPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    amount: "",
    merchant_raw: "",
    merchant_normalized: "",
    direction: "debit",
    ownership_type: "mine",
    note: "",
    is_big_spend: false,
    is_emi: false,
    is_ignored: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/transactions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create transaction");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function updateField(name: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Add Transaction</h1>

      <form onSubmit={handleSubmit} className="space-y-4 border rounded-2xl p-6">
        <div>
          <label className="block mb-1 font-medium">Amount</label>
          <input
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(e) => updateField("amount", e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Merchant Raw</label>
          <input
            type="text"
            value={form.merchant_raw}
            onChange={(e) => updateField("merchant_raw", e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Merchant Normalized</label>
          <input
            type="text"
            value={form.merchant_normalized}
            onChange={(e) => updateField("merchant_normalized", e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Direction</label>
          <select
            value={form.direction}
            onChange={(e) => updateField("direction", e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="debit">debit</option>
            <option value="credit">credit</option>
            <option value="refund">refund</option>
          </select>
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
            rows={4}
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

        {error && <p className="text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg border"
        >
          {loading ? "Saving..." : "Save Transaction"}
        </button>
      </form>
    </main>
  );
}