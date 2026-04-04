"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProcessMailboxButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRun() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/automation/process-mailbox", {
        method: "POST",
        headers: {
          "x-cron-secret": process.env.NEXT_PUBLIC_FAKE_CLIENT_SECRET || "",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process mailbox");
      }

      setMessage("Mailbox processed");
      router.refresh();
    } catch (err: any) {
      setMessage(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRun}
      disabled={loading}
      className="border rounded-lg px-4 py-2"
    >
      {loading ? "Running..." : "Process Mailbox"}
    </button>
  );
}