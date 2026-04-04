"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MatchTransactionsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleMatch() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/gmail/match-transactions", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to match transactions");
      }

      setMessage(`Matched ${data.matchedCount}, skipped ${data.skippedCount}`);
      router.refresh();
    } catch (err: any) {
      setMessage(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleMatch}
        disabled={loading}
        className="px-4 py-2 rounded-lg border"
      >
        {loading ? "Matching..." : "Match Transactions"}
      </button>

      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
}