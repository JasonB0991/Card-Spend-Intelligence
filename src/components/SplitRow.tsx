"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Split = {
  id: string;
  transaction_id: string;
  person_name: string;
  amount_owed: number;
  status: string;
  comment: string | null;
};

export default function SplitRow({ split }: { split: Split }) {
  const router = useRouter();

  const [form, setForm] = useState({
    person_name: split.person_name,
    amount_owed: String(split.amount_owed),
    status: split.status,
    comment: split.comment || "",
  });

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function updateField(name: string, value: string) {
    setSaved(false);
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
  setLoading(true);
  setSaved(false);
  setError("");

  try {
    const res = await fetch(`/api/splits/${split.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        person_name: form.person_name,
        amount_owed: Number(form.amount_owed),
        status: form.status,
        comment: form.comment,
      }),
    });

    const raw = await res.text();
    let data: any = null;

    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      throw new Error(`Non-JSON response: ${raw.slice(0, 120)}`);
    }

    if (!res.ok) {
      throw new Error(data?.error || "Failed to update split");
    }

    setSaved(true);
    router.refresh();
  } catch (err: any) {
    setError(err.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
}
  async function handleDelete() {
  setDeleting(true);
  setError("");

  try {
    const res = await fetch(`/api/splits/${split.id}`, {
      method: "DELETE",
    });

    const raw = await res.text();
    let data: any = null;

    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      throw new Error(`Non-JSON response: ${raw.slice(0, 120)}`);
    }

    if (!res.ok) {
      throw new Error(data?.error || "Failed to delete split");
    }

    router.refresh();
  } catch (err: any) {
    setError(err.message || "Something went wrong");
  } finally {
    setDeleting(false);
  }
}

  return (
    <div className="border rounded-xl p-3 space-y-3">
      <input
        type="text"
        value={form.person_name}
        onChange={(e) => updateField("person_name", e.target.value)}
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Person name"
      />

      <input
        type="number"
        step="0.01"
        value={form.amount_owed}
        onChange={(e) => updateField("amount_owed", e.target.value)}
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Amount owed"
      />

      <select
        value={form.status}
        onChange={(e) => updateField("status", e.target.value)}
        className="w-full border rounded-lg px-3 py-2"
      >
        <option value="pending">pending</option>
        <option value="collected">collected</option>
        <option value="waived">waived</option>
      </select>

      <textarea
        value={form.comment}
        onChange={(e) => updateField("comment", e.target.value)}
        className="w-full border rounded-lg px-3 py-2"
        rows={2}
        placeholder="Comment"
      />

      <div className="flex gap-3 items-center">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 rounded-lg border"
        >
          {loading ? "Saving..." : "Save Split"}
        </button>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 rounded-lg border"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>

        {saved && <span className="text-sm text-green-600">Saved</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}