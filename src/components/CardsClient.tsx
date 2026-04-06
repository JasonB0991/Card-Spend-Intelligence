"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SupportedCardType = {
  id: string;
  code: string;
  bank_name: string;
  card_name: string;
};

type Card = {
  id: string;
  nickname: string | null;
  card_last4: string;
  cardholder_name: string | null;
  is_active: boolean;
  supported_card_types?: {
    bank_name: string;
    card_name: string;
  } | null;
};

type CardForm = {
  supported_card_type_id: string;
  card_last4: string;
  cardholder_name: string;
  is_active: boolean;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getCardTitle(card: Card) {
  const bank = card.supported_card_types?.bank_name || "Card";
  const name = card.supported_card_types?.card_name || "";

  return `${bank}${name ? ` • ${name}` : ""}`;
}

function getInitialForm(card?: Card | null): CardForm {
  return {
    supported_card_type_id: "",
    card_last4: card?.card_last4 || "",
    cardholder_name: card?.cardholder_name || "",
    is_active: card?.is_active ?? true,
  };
}

export default function CardsClient({ cards }: { cards: Card[] }) {
  const router = useRouter();

  const [items, setItems] = useState<Card[]>(cards);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [supportedTypes, setSupportedTypes] = useState<SupportedCardType[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<CardForm>(getInitialForm());
  const [createForm, setCreateForm] = useState<CardForm>({
    supported_card_type_id: "",
    card_last4: "",
    cardholder_name: "",
    is_active: true,
  });

  useEffect(() => {
    setItems(cards);
  }, [cards]);

  useEffect(() => {
    async function loadSupportedTypes() {
      try {
        const res = await fetch("/api/supported-card-types");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load supported card types");
        }

        setSupportedTypes(data);
      } catch (err: any) {
        setMessage(err.message || "Something went wrong");
      } finally {
        setInitialLoading(false);
      }
    }

    loadSupportedTypes();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePanels();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const selectedCard = useMemo(
    () => items.find((card) => card.id === selectedId) || null,
    [items, selectedId],
  );

  useEffect(() => {
    if (!selectedCard) {
      setForm(getInitialForm());
      return;
    }

    setForm(getInitialForm(selectedCard));
    setMessage("");
  }, [selectedCard]);

  function closePanels() {
    setSelectedId(null);
    setIsCreateOpen(false);
    setMessage("");
  }

  function updateEditField<K extends keyof CardForm>(key: K, value: CardForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateCreateField<K extends keyof CardForm>(
    key: K,
    value: CardForm[K],
  ) {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
  }

  const isEditDirty = useMemo(() => {
    if (!selectedCard) return false;

    const original = getInitialForm(selectedCard);
    return JSON.stringify(original) !== JSON.stringify(form);
  }, [selectedCard, form]);

  const isCreateDirty = useMemo(() => {
    return (
      createForm.supported_card_type_id.trim().length > 0 ||
      createForm.card_last4.trim().length > 0 ||
      createForm.cardholder_name.trim().length > 0
    );
  }, [createForm]);

  async function handleCreate() {
    if (!createForm.supported_card_type_id || !createForm.card_last4) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supported_card_type_id: createForm.supported_card_type_id,
          card_last4: createForm.card_last4,
          cardholder_name: createForm.cardholder_name || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add card");
      }

      setCreateForm({
        supported_card_type_id: "",
        card_last4: "",
        cardholder_name: "",
        is_active: true,
      });

      closePanels();
      router.refresh();
    } catch (err: any) {
      setMessage(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!selectedCard || !isEditDirty) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`/api/cards/${selectedCard.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          card_last4: form.card_last4,
          cardholder_name: form.cardholder_name || null,
          is_active: form.is_active,
          nickname: null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update card");
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedCard.id
            ? {
                ...item,
                card_last4: form.card_last4,
                cardholder_name: form.cardholder_name || null,
                is_active: form.is_active,
              }
            : item,
        ),
      );

      closePanels();
      router.refresh();
    } catch (err: any) {
      setMessage(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!selectedCard) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`/api/cards/${selectedCard.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete card");
      }

      setItems((prev) => prev.filter((item) => item.id !== selectedCard.id));
      closePanels();
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
              Cards
            </h1>
            <p className="mt-2 text-base text-slate-500">
              Manage your cards and keep card details up to date.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsCreateOpen(true);
              setSelectedId(null);
              setMessage("");
            }}
            className="inline-flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-emerald-50"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5 text-slate-500"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Add a card
          </button>
        </div>

        {items.length === 0 ? (
          <div className="mt-6 rounded-[28px] border border-dashed border-emerald-200 bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-base font-medium text-slate-800">No cards added yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Add your first card to start matching transactions faster.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setSelectedId(card.id);
                  setIsCreateOpen(false);
                  setMessage("");
                }}
                className="rounded-[28px] border border-emerald-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold tracking-tight text-slate-950">
                      {getCardTitle(card)}
                    </p>
                    <p className="mt-4 text-sm text-slate-500">Last 4 digits</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">
                      {card.card_last4 || "—"}
                    </p>

                    <p className="mt-4 text-sm text-slate-500">Cardholder name</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {card.cardholder_name || "—"}
                    </p>
                  </div>

                  <span
                    className={cn(
                      "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                      card.is_active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {card.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {(isCreateOpen || selectedCard) && (
        <>
          <button
            type="button"
            aria-label="Close panel"
            onClick={closePanels}
            className="absolute inset-0 z-30 bg-slate-950/20"
          />

          <aside className="absolute right-0 top-0 z-40 flex h-full w-full max-w-[560px] flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {isCreateOpen ? "Add card" : "Edit card"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isCreateOpen
                    ? "Add a new card to your workspace."
                    : selectedCard
                      ? getCardTitle(selectedCard)
                      : ""}
                </p>
              </div>

              <button
                onClick={closePanels}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-white text-slate-500 transition hover:bg-slate-50"
                aria-label="Close panel"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path d="M6 6l12 12" />
                  <path d="M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              {initialLoading ? (
                <p className="text-sm text-slate-500">Loading supported cards...</p>
              ) : isCreateOpen ? (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Supported Card Type
                    </label>
                    <select
                      value={createForm.supported_card_type_id}
                      onChange={(e) =>
                        updateCreateField("supported_card_type_id", e.target.value)
                      }
                      className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-300"
                    >
                      <option value="">Select a supported card</option>
                      {supportedTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.bank_name} - {type.card_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Card Last 4
                    </label>
                    <input
                      type="text"
                      value={createForm.card_last4}
                      onChange={(e) =>
                        updateCreateField(
                          "card_last4",
                          e.target.value.replace(/\D/g, "").slice(0, 4),
                        )
                      }
                      className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-300"
                      placeholder="2862"
                      maxLength={4}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={createForm.cardholder_name}
                      onChange={(e) =>
                        updateCreateField("cardholder_name", e.target.value)
                      }
                      className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-300"
                      placeholder="Shubhangan Das"
                    />
                  </div>
                </div>
              ) : selectedCard ? (
                <div className="space-y-5">
                  <div className="rounded-3xl border border-emerald-100 bg-[#f8faf7] p-4">
                    <p className="text-sm text-slate-500">Card Name</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">
                      {getCardTitle(selectedCard)}
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Card Last 4
                    </label>
                    <input
                      type="text"
                      value={form.card_last4}
                      onChange={(e) =>
                        updateEditField(
                          "card_last4",
                          e.target.value.replace(/\D/g, "").slice(0, 4),
                        )
                      }
                      className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-300"
                      maxLength={4}
                      placeholder="2862"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={form.cardholder_name}
                      onChange={(e) =>
                        updateEditField("cardholder_name", e.target.value)
                      }
                      className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-300"
                      placeholder="Cardholder name"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Status
                    </label>
                    <select
                      value={form.is_active ? "active" : "inactive"}
                      onChange={(e) =>
                        updateEditField("is_active", e.target.value === "active")
                      }
                      className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-300"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              ) : null}

              {message && <p className="mt-4 text-sm text-rose-600">{message}</p>}
            </div>

            <div className="sticky bottom-0 border-t border-slate-100 bg-white px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                {isCreateOpen ? (
                  <div />
                ) : (
                  <button
                    onClick={handleDelete}
                    disabled={loading || !selectedCard}
                    className="rounded-full border border-rose-200 px-5 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    Delete Card
                  </button>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={closePanels}
                    className="rounded-full border border-emerald-100 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  {isCreateOpen ? (
                    <button
                      onClick={handleCreate}
                      disabled={
                        loading ||
                        !createForm.supported_card_type_id ||
                        createForm.card_last4.length !== 4
                      }
                      className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {loading ? "Saving..." : "Save"}
                    </button>
                  ) : (
                    <button
                      onClick={handleSave}
                      disabled={!isEditDirty || loading}
                      className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {loading ? "Saving..." : "Save"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}