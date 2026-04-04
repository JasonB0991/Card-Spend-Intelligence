"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncGmailButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSync() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/gmail/sync", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to sync Gmail");
      }

      setMessage(`Synced ${data.saved} emails`);
      router.refresh();
    } catch (err: any) {
      setMessage(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6">
      <button
        onClick={handleSync}
        disabled={loading}
        className="px-4 py-2 rounded-lg border"
      >
        {loading ? "Syncing..." : "Sync Gmail"}
      </button>

      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
}