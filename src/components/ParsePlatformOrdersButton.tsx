"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ParsePlatformOrdersButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleParse() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/gmail/parse-platform-orders", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to parse platform orders");
      }

      setMessage(
        `Parsed ${data.parsedCount}, skipped ${data.skippedCount}, duplicates ${data.duplicateCount}, failed ${data.failedCount}`
      );
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
        onClick={handleParse}
        disabled={loading}
        className="px-4 py-2 rounded-lg border"
      >
        {loading ? "Parsing platform orders..." : "Parse Platform Orders"}
      </button>

      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
}