"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SupportedCardType = {
  id: string;
  code: string;
  bank_name: string;
  card_name: string;
  network: string | null;
};

export default function AddCardForm() {
  const router = useRouter();

  const [supportedTypes, setSupportedTypes] = useState<SupportedCardType[]>([]);
  const [supportedCardTypeId, setSupportedCardTypeId] = useState("");
  const [nickname, setNickname] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [message, setMessage] = useState("");

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supported_card_type_id: supportedCardTypeId,
          nickname,
          card_last4: cardLast4,
          cardholder_name: cardholderName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add card");
      }

      setNickname("");
      setCardLast4("");
      setCardholderName("");
      setSupportedCardTypeId("");
      setMessage("Card added successfully");
      router.refresh();
    } catch (err: any) {
      setMessage(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border rounded-2xl p-4 shadow-sm mb-6">
      <h2 className="text-xl font-semibold mb-4">Add Card</h2>

      {initialLoading ? (
        <p>Loading supported cards...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Supported Card Type</label>
            <select
              value={supportedCardTypeId}
              onChange={(e) => setSupportedCardTypeId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">Select a supported card</option>
              {supportedTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.bank_name} - {type.card_name}
                  {type.network ? ` (${type.network})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="My food card"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Card Last 4</label>
            <input
              type="text"
              value={cardLast4}
              onChange={(e) => setCardLast4(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="2862"
              maxLength={4}
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Cardholder Name</label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Shubhangan Das"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg border"
          >
            {loading ? "Adding..." : "Add Card"}
          </button>

          {message && <p className="text-sm">{message}</p>}
        </form>
      )}
    </div>
  );
}