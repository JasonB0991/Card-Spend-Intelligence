"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

type EditableSplit = {
  id: string;
  person_name: string;
  amount_owed: string;
  status: string;
  comment: string;
  isNew?: boolean;
};

type Props = {
  transactions: Transaction[];
  splitsByTransactionId?: Record<string, Split[]>;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatAmount(value: number) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatPlatformName(code: string | null | undefined) {
  if (!code) return "—";

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

function formatOwnership(value: string | null | undefined) {
  return (value || "mine").replaceAll("_", " ");
}

function formatReviewStatus(value: string | null | undefined) {
  return (value || "needs_review").replaceAll("_", " ");
}

function buildTags(txn: Transaction) {
  const tags: string[] = [];
  if (txn.is_big_spend) tags.push("Big Spend");
  if (txn.is_emi) tags.push("EMI");
  if (txn.is_ignored) tags.push("Ignore");
  return tags;
}

function normalizeSplit(split: Split): EditableSplit {
  return {
    id: split.id,
    person_name: split.person_name || "",
    amount_owed: String(split.amount_owed ?? ""),
    status: split.status || "pending",
    comment: split.comment || "",
  };
}

function ownershipBadgeClass(value: string | null | undefined) {
  switch (value) {
    case "shared":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "reimbursable":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "not_mine":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function reviewBadgeClass(status: string | null | undefined) {
  switch (status) {
    case "confirmed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function tagClass(tag: string) {
  const styles: Record<string, string> = {
    "Big Spend": "border-rose-200 bg-rose-50 text-rose-700",
    EMI: "border-violet-200 bg-violet-50 text-violet-700",
    Ignore: "border-slate-200 bg-slate-100 text-slate-700",
  };

  return styles[tag] || "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function initialForm(txn: Transaction) {
  return {
    ownership_type: txn.ownership_type || "mine",
    note: txn.note || "",
    is_big_spend: !!txn.is_big_spend,
    is_emi: !!txn.is_emi,
    is_ignored: !!txn.is_ignored,
    product_name: txn.product_name || "",
    platform_code: txn.platform_code || "",
    review_status: txn.review_status || "needs_review",
  };
}

const FILTERS = {
  ownership: ["mine", "shared", "not_mine", "reimbursable"],
  review: ["needs_review", "confirmed", "rejected"],
};

export default function TransactionWorkbenchCard({
  transactions,
  splitsByTransactionId = {},
}: Props) {
  const router = useRouter();

  const [items, setItems] = useState<Transaction[]>(transactions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [ownershipFilters, setOwnershipFilters] = useState<string[]>([]);
  const [reviewFilters, setReviewFilters] = useState<string[]>([]);
  const [showIgnored, setShowIgnored] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [form, setForm] = useState<ReturnType<typeof initialForm> | null>(null);
  const [editableSplits, setEditableSplits] = useState<EditableSplit[]>([]);

  useEffect(() => {
    setItems(transactions);
  }, [transactions]);

  const selectedTxn = useMemo(
    () => items.find((txn) => txn.id === selectedId) || null,
    [items, selectedId],
  );

  useEffect(() => {
    if (!selectedTxn) {
      setForm(null);
      setEditableSplits([]);
      return;
    }

    setForm(initialForm(selectedTxn));
    setEditableSplits(
      (splitsByTransactionId[selectedTxn.id] || []).map(normalizeSplit),
    );
    setMessage("");
  }, [selectedTxn, splitsByTransactionId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedId(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((txn) => {
      if (!showIgnored && txn.is_ignored) return false;
      if (
        ownershipFilters.length > 0 &&
        !ownershipFilters.includes(txn.ownership_type || "mine")
      ) {
        return false;
      }
      if (
        reviewFilters.length > 0 &&
        !reviewFilters.includes(txn.review_status || "needs_review")
      ) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        txn.product_name,
        txn.merchant_normalized,
        txn.merchant_raw,
        txn.platform_code,
        txn.note,
        txn.card_label,
        txn.card_last4,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [items, ownershipFilters, reviewFilters, search, showIgnored]);

  const isDirty = useMemo(() => {
    if (!selectedTxn || !form) return false;

    const originalForm = initialForm(selectedTxn);
    const originalSplits = JSON.stringify(
      (splitsByTransactionId[selectedTxn.id] || []).map(normalizeSplit),
    );
    const currentSplits = JSON.stringify(editableSplits);

    return (
      JSON.stringify(originalForm) !== JSON.stringify(form) ||
      (form.ownership_type === "shared" && originalSplits !== currentSplits)
    );
  }, [editableSplits, form, selectedTxn, splitsByTransactionId]);

  function updateField(
    key: keyof ReturnType<typeof initialForm>,
    value: string | boolean,
  ) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateSplitField(
    id: string,
    key: keyof EditableSplit,
    value: string,
  ) {
    setEditableSplits((prev) =>
      prev.map((split) => (split.id === id ? { ...split, [key]: value } : split)),
    );
  }

  function addSplit() {
    setEditableSplits((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        person_name: "",
        amount_owed: "",
        status: "pending",
        comment: "",
        isNew: true,
      },
    ]);
  }

  function removeSplit(id: string) {
    setEditableSplits((prev) => prev.filter((split) => split.id !== id));
  }

  async function saveSplits(transactionId: string) {
    if (!form || form.ownership_type !== "shared") return;

    const originalSplits = splitsByTransactionId[transactionId] || [];
    const existingIds = new Set(originalSplits.map((split) => split.id));
    const currentIds = new Set(
      editableSplits.filter((split) => !split.isNew).map((split) => split.id),
    );

    const deletedIds = [...existingIds].filter((id) => !currentIds.has(id));

    await Promise.all(
      editableSplits.map(async (split) => {
        const payload = {
          transaction_id: transactionId,
          person_name: split.person_name,
          amount_owed: Number(split.amount_owed || 0),
          status: split.status,
          comment: split.comment || null,
        };

        if (split.isNew) {
          await fetch("/api/splits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          return;
        }

        await fetch(`/api/splits/${split.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }),
    );

    await Promise.all(
      deletedIds.map((id) =>
        fetch(`/api/splits/${id}`, {
          method: "DELETE",
        }),
      ),
    );
  }

  async function handleSave() {
    if (!selectedTxn || !form || !isDirty) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`/api/transactions/${selectedTxn.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          review_note: selectedTxn.review_note || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update transaction");

      await saveSplits(selectedTxn.id);

      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedTxn.id
            ? {
                ...item,
                ...form,
              }
            : item,
        ),
      );

      setSelectedId(null);
      router.refresh();
    } catch (err: any) {
      setMessage(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!selectedTxn) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`/api/transactions/${selectedTxn.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete transaction");
      }

      setItems((prev) => prev.filter((item) => item.id !== selectedTxn.id));
      setSelectedId(null);
      router.refresh();
    } catch (err: any) {
      setMessage(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative h-full w-full min-w-0 overflow-hidden bg-[#f8faf7]">
      <div className="h-full w-full min-w-0 overflow-y-auto px-6 py-6 lg:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
              Transactions
            </h1>
            <p className="mt-2 text-base text-slate-500">
              Browse, filter, and edit transactions in a workbench table.
            </p>
          </div>

          <div className="relative self-start">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-white text-slate-500 shadow-sm"
                aria-label="Search"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </button>
              

              <button
                type="button"
                onClick={() => setFilterOpen((prev) => !prev)}
                className="inline-flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-emerald-50"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 text-slate-500">
                  <path d="M4 6h16" />
                  <path d="M7 12h10" />
                  <path d="M10 18h4" />
                </svg>
                Filters
              </button>
            </div>

            {filterOpen && (
              <div className="absolute right-0 z-20 mt-3 w-[380px] rounded-[28px] border border-emerald-100 bg-white p-5 shadow-xl">
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-900">
                      Search
                    </label>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search product, merchant, or platform"
                      className="w-full rounded-2xl border border-emerald-100 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-900">Ownership type</p>
                    <div className="space-y-2">
                      {FILTERS.ownership.map((value) => (
                        <label key={value} className="flex items-center gap-3 rounded-2xl border border-emerald-100 px-3 py-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={ownershipFilters.includes(value)}
                            onChange={() =>
                              setOwnershipFilters((prev) =>
                                prev.includes(value)
                                  ? prev.filter((item) => item !== value)
                                  : [...prev, value],
                              )
                            }
                            className="h-4 w-4 rounded border-emerald-300"
                          />
                          <span className="capitalize">{formatOwnership(value)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-900">Review status</p>
                    <div className="space-y-2">
                      {FILTERS.review.map((value) => (
                        <label key={value} className="flex items-center gap-3 rounded-2xl border border-emerald-100 px-3 py-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={reviewFilters.includes(value)}
                            onChange={() =>
                              setReviewFilters((prev) =>
                                prev.includes(value)
                                  ? prev.filter((item) => item !== value)
                                  : [...prev, value],
                              )
                            }
                            className="h-4 w-4 rounded border-emerald-300"
                          />
                          <span className="capitalize">{formatReviewStatus(value)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl border border-emerald-100 px-3 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={showIgnored}
                      onChange={(e) => setShowIgnored(e.target.checked)}
                      className="h-4 w-4 rounded border-emerald-300"
                    />
                    Show ignored transactions
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-separate border-spacing-0">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-sm text-slate-500">
                  <th className="w-[24%] px-5 py-4 font-medium">Product Name</th>
                  <th className="w-[10%] px-5 py-4 font-medium">Amount</th>
                  <th className="w-[11%] px-5 py-4 font-medium">Date</th>
                  <th className="w-[15%] px-5 py-4 font-medium">Card Name</th>
                  <th className="w-[8%] px-5 py-4 font-medium">Last 4</th>
                  <th className="w-[10%] px-5 py-4 font-medium">Platform Code</th>
                  <th className="w-[10%] px-5 py-4 font-medium">Ownership Type</th>
                  <th className="w-[10%] px-5 py-4 font-medium">Review Status</th>
                  <th className="w-[12%] px-5 py-4 font-medium">Note</th>
                  <th className="w-[12%] px-5 py-4 font-medium">Tags</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-12 text-center text-sm text-slate-500">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((txn) => {
                    const tags = buildTags(txn);
                    const isSelected = selectedId === txn.id;

                    return (
                      <tr
                        key={txn.id}
                        onClick={() => setSelectedId(txn.id)}
                        className={cn(
                          "cursor-pointer border-t border-slate-100 align-top transition hover:bg-slate-50",
                          isSelected && "bg-emerald-50/60",
                        )}
                      >
                        <td className="px-5 py-4 align-top">
                          <div className="max-w-[260px] truncate text-[15px] font-medium leading-6 text-slate-900">
                            {txn.product_name || txn.merchant_normalized || txn.merchant_raw || "Unknown"}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top text-sm font-medium text-slate-900">
                          {formatAmount(txn.amount)}
                        </td>
                        <td className="px-5 py-4 align-top text-sm text-slate-700">
                          {formatDate(txn.txn_date)}
                        </td>
                        <td className="px-5 py-4 align-top text-sm text-slate-700">
                          <div className="max-w-[170px] truncate">
                            {txn.card_label || "—"}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top text-sm text-slate-700">
                          {txn.card_last4 || "—"}
                        </td>
                        <td className="px-5 py-4 align-top text-sm text-slate-700">
                          {formatPlatformName(txn.platform_code)}
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span className={cn("inline-flex rounded-xl border px-3 py-1 text-xs font-semibold capitalize", ownershipBadgeClass(txn.ownership_type))}>
                            {formatOwnership(txn.ownership_type)}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span className={cn("inline-flex rounded-xl border px-3 py-1 text-xs font-semibold capitalize", reviewBadgeClass(txn.review_status))}>
                            {formatReviewStatus(txn.review_status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top text-sm text-slate-600">
                          <span className="block max-w-[180px] truncate">{txn.note || "—"}</span>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            {tags.length ? (
                              tags.map((tag) => (
                                <span key={tag} className={cn("inline-flex rounded-xl border px-3 py-1 text-xs font-semibold", tagClass(tag))}>
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedTxn && form && (
        <>
          <button
            type="button"
            aria-label="Close edit panel"
            onClick={() => setSelectedId(null)}
            className="absolute inset-0 z-30 bg-slate-950/20"
          />

          <aside className="absolute right-0 top-0 z-40 flex h-full w-full max-w-[560px] flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Edit transaction
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formatPlatformName(selectedTxn.platform_code)} • {formatDateTime(selectedTxn.txn_date)}
                </p>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-white text-slate-500 transition hover:bg-slate-50"
                aria-label="Close panel"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <path d="M6 6l12 12" />
                  <path d="M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <div className="rounded-3xl border border-emerald-100 bg-[#f8faf7] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Product Name</p>
                    <p className="mt-1 text-m font-semibold text-slate-950 break-words">
                      {selectedTxn.product_name || selectedTxn.merchant_normalized || selectedTxn.merchant_raw || "Unknown"}
                    </p>
                    <p className="mt-4 text-sm text-slate-500">Amount</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">
                      {formatAmount(selectedTxn.amount)}
                    </p>
                  </div>
                  
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={form.product_name}
                    onChange={(e) => updateField("product_name", e.target.value)}
                    className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-300"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Platform Code
                  </label>
                  <input
                    type="text"
                    value={form.platform_code}
                    onChange={(e) => updateField("platform_code", e.target.value)}
                    className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-300"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Ownership Type
                  </label>
                  <select
                    value={form.ownership_type}
                    onChange={(e) => updateField("ownership_type", e.target.value)}
                    className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-300"
                  >
                    <option value="mine">Mine</option>
                    <option value="shared">Shared</option>
                    <option value="not_mine">Not mine</option>
                    <option value="reimbursable">Reimbursable</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Review Status
                  </label>
                  <select
                    value={form.review_status}
                    onChange={(e) => updateField("review_status", e.target.value)}
                    className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-300"
                  >
                    <option value="needs_review">Needs review</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Note
                  </label>
                  <textarea
                    value={form.note}
                    onChange={(e) => updateField("note", e.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-300"
                    placeholder="Add context for this transaction"
                  />
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-sm font-medium text-slate-700">Tags</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    ["is_big_spend", "Big Spend"],
                    ["is_emi", "EMI"],
                    ["is_ignored", "Ignore"],
                  ].map(([key, label]) => {
                    const checked = Boolean(form[key as keyof typeof form]);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateField(key as keyof typeof form, !checked)}
                        className={cn(
                          "rounded-2xl border px-4 py-2 text-sm font-medium transition",
                          checked
                            ? "border-emerald-700 bg-emerald-700 text-white"
                            : "border-emerald-100 bg-white text-slate-700 hover:bg-emerald-50",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.ownership_type === "shared" && (
                <div className="mt-8 rounded-3xl border border-emerald-100 bg-[#f8faf7] p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Splits</h3>
                      <p className="text-sm text-slate-500">
                        Add and manage shared splits.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addSplit}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-white text-slate-700 transition hover:bg-emerald-50"
                      aria-label="Add split"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {editableSplits.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-emerald-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                        No splits yet. Click + to add one.
                      </div>
                    ) : (
                      editableSplits.map((split, index) => (
                        <div key={split.id} className="rounded-2xl border border-emerald-100 bg-white p-4">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">Split {index + 1}</p>
                            <button
                              type="button"
                              onClick={() => removeSplit(split.id)}
                              className="text-sm font-medium text-rose-600 transition hover:text-rose-700"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700">Name</label>
                              <input
                                type="text"
                                value={split.person_name}
                                onChange={(e) => updateSplitField(split.id, "person_name", e.target.value)}
                                className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-300"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700">Amount</label>
                              <input
                                type="number"
                                step="0.01"
                                value={split.amount_owed}
                                onChange={(e) => updateSplitField(split.id, "amount_owed", e.target.value)}
                                className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-300"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                              <select
                                value={split.status}
                                onChange={(e) => updateSplitField(split.id, "status", e.target.value)}
                                className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-300"
                              >
                                <option value="pending">Pending</option>
                                <option value="collected">Collected</option>
                                <option value="waived">Waived</option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700">Comment</label>
                              <input
                                type="text"
                                value={split.comment}
                                onChange={(e) => updateSplitField(split.id, "comment", e.target.value)}
                                className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-300"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {message && <p className="mt-4 text-sm text-rose-600">{message}</p>}
            </div>

            <div className="sticky bottom-0 border-t border-slate-100 bg-white px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="rounded-full border border-rose-200 px-5 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                >
                  Delete Transaction
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="rounded-full border border-emerald-100 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!isDirty || loading}
                    className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
