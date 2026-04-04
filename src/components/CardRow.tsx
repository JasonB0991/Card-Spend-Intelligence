"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Card = {
  id: string;
  nickname: string | null;
  card_last4: string;
  cardholder_name: string | null;
  is_active: boolean;
  supported_card_types?: {
    bank_name: string;
    card_name: string;
    network: string | null;
  } | null;
};

export default function CardRow({ card }: { card: Card }) {
  const router = useRouter();

  const [nickname, setNickname] = useState(card.nickname || "");
  const [cardholderName, setCardholderName] = useState(
    card.cardholder_name || ""
  );
  const [cardLast4, setCardLast4] = useState(card.card_last4 || "");
  const [isActive, setIsActive] = useState(!!card.is_active);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function saveChanges(payload?: Record<string, unknown>) {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          payload || {
            nickname: nickname || null,
            cardholder_name: cardholderName || null,
            card_last4: cardLast4,
            is_active: isActive,
          }
        ),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update card");
      }

      setMessage("Saved");
      router.refresh();
    } catch (err: any) {
      setMessage(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive() {
    const next = !isActive;
    setIsActive(next);
    await saveChanges({ is_active: next });
  }

  return (
    <div className="border rounded-2xl p-4 shadow-sm space-y-4">
      <div>
        <p className="font-semibold text-lg">
          {card.supported_card_types?.bank_name} -{" "}
          {card.supported_card_types?.card_name}
          {card.supported_card_types?.network
            ? ` (${card.supported_card_types.network})`
            : ""}
        </p>
        <p className="text-sm text-gray-600">
          Status: {isActive ? "active" : "inactive"}
        </p>
      </div>

      <div>
        <label className="block mb-1 font-medium">Nickname</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="My primary card"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">Cardholder Name</label>
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Cardholder name"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">Card Last 4</label>
        <input
          type="text"
          value={cardLast4}
          onChange={(e) => setCardLast4(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          maxLength={4}
          placeholder="2862"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => saveChanges()}
          disabled={loading}
          className="px-4 py-2 rounded-lg border"
        >
          {loading ? "Saving..." : "Save"}
        </button>

        <button
          onClick={toggleActive}
          disabled={loading}
          className="px-4 py-2 rounded-lg border"
        >
          {isActive ? "Deactivate" : "Reactivate"}
        </button>
      </div>

      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}