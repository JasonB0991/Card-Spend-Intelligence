"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(searchParams.get("error") || "");

  async function signIn() {
    if (!agreed) return;
    setLoading(true);
    setError("");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "https://www.googleapis.com/auth/gmail.readonly",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
      <p className="text-3xl font-semibold tracking-tight text-slate-950">Spendzo</p>
      <p className="mt-1 text-sm text-slate-500">Card spend analytics from your inbox</p>

      <div className="mt-8 space-y-3 text-sm text-slate-700">
        <p className="font-medium text-slate-900">What signing in does</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Gives Spendzo <strong>read-only</strong> access to your Gmail.
          </li>
          <li>
            It only looks at card alerts from supported banks (HDFC, ICICI, SBI
            Card, IDFC FIRST, YES Bank) and order emails from Swiggy, Zomato,
            Amazon, Flipkart and Agoda. Other mail is never fetched.
          </li>
          <li>It can never send, delete or change any email.</li>
          <li>Your data is visible only to you.</li>
        </ul>
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl bg-[#f3f6f2] p-4 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-emerald-700"
        />
        <span>
          I agree to let Spendzo read my Gmail as described above, and to the{" "}
          <Link href="/privacy" className="font-medium text-emerald-800 underline">
            privacy policy
          </Link>
          .
        </span>
      </label>

      <button
        onClick={signIn}
        disabled={!agreed || loading}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="#fff" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.7 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.68 3.7 14.55 2.75 12 2.75 6.9 2.75 2.75 6.9 2.75 12S6.9 21.25 12 21.25c5.34 0 8.88-3.75 8.88-9.04 0-.6-.07-1.06-.15-1.51Z" />
        </svg>
        {loading ? "Redirecting to Google…" : "Continue with Google"}
      </button>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        <strong>Important:</strong> on Google&rsquo;s permission screen, tick{" "}
        <em>&ldquo;View your email messages and settings&rdquo;</em> (or click{" "}
        <em>Select all</em>). Without it Spendzo can&rsquo;t read your card alerts.
      </p>

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        This is a private test. Google will show an &ldquo;app isn&rsquo;t
        verified&rdquo; warning; choose <em>Advanced → Continue</em>. Access
        expires after 7 days, after which you just sign in again.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f6f2] px-4 py-10">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
