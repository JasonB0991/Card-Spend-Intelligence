"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ParseTransactionsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleParse() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/gmail/parse-transactions", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to parse transactions");
      }

      setMessage(
  `Parsed ${data.parsedCount}, skipped ${data.skippedCount}, duplicates ${data.duplicateCount}, failed ${data.failedInsertCount}`
);
      router.refresh();
    } catch (err: any) {
      setMessage(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4">
      <button
        onClick={handleParse}
        disabled={loading}
        className="px-4 py-2 rounded-lg border"
      >
        {loading ? "Parsing..." : "Parse Transactions"}
      </button>

      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
}