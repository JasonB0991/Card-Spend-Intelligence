"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { compact?: boolean };

export default function ProcessMailboxButton({ compact = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handleRun() {
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const res = await fetch("/api/gmail/process", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.error ||
            (res.status >= 502
              ? "Sync took too long. Please press Sync again; it continues where it stopped."
              : "Failed to sync mailbox")
        );
      }

      const saved = data.syncResult?.saved ?? 0;
      const remaining = data.syncResult?.remaining ?? 0;
      const txns = data.bankResult?.parsedCount ?? 0;
      const summary =
        saved === 0 && txns === 0
          ? "Up to date"
          : `${saved} new email${saved === 1 ? "" : "s"}, ${txns} new transaction${txns === 1 ? "" : "s"}`;
      setMessage(remaining > 0 ? `${summary}. More waiting, sync again.` : summary);
      router.refresh();
    } catch (err) {
      setIsError(true);
      setMessage((err as Error).message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const icon = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );

  if (compact) {
    return (
      <button
        onClick={handleRun}
        disabled={loading}
        className="flex h-12 w-12 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:opacity-50"
        aria-label="Sync mailbox"
        title={message || "Sync mailbox"}
      >
        {icon}
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={handleRun}
        disabled={loading}
        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 disabled:opacity-50"
      >
        <span className="text-slate-500">{icon}</span>
        {loading ? "Syncing…" : "Sync mailbox"}
      </button>
      {message && (
        <p className={`px-4 pt-1 text-xs ${isError ? "text-red-600" : "text-slate-500"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
