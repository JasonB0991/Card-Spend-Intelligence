import Link from "next/link";

export const metadata = { title: "Privacy policy · Spendzo" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f3f6f2] px-4 py-10">
      <article className="mx-auto max-w-2xl space-y-5 rounded-3xl border border-emerald-100 bg-white p-8 text-sm leading-relaxed text-slate-700 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">Privacy policy</h1>
        <p className="text-slate-500">Last updated: 15 November 2026</p>

        <p>
          Spendzo is a private, invite-only test app that turns card alert and
          order emails into a spending dashboard. This page explains what it
          reads and what it does with it.
        </p>

        <h2 className="text-base font-semibold text-slate-900">What we access</h2>
        <p>
          When you sign in with Google you grant read-only Gmail access
          (<code>gmail.readonly</code>). Spendzo only searches for emails from
          a fixed list of senders: credit-card alert addresses of supported
          banks, and order confirmations from supported shopping and food
          platforms. It never sends, deletes, labels or modifies email.
        </p>

        <h2 className="text-base font-semibold text-slate-900">What we store</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your Google account email and the OAuth tokens needed to read those emails.</li>
          <li>The matching emails (sender, subject, date and body) and the transactions and orders extracted from them.</li>
          <li>Cards, notes and splits you add yourself.</li>
        </ul>
        <p>
          Data is stored in a Supabase (PostgreSQL) database. Database rules
          make each user&rsquo;s data visible only to that user.
        </p>

        <h2 className="text-base font-semibold text-slate-900">What we don&rsquo;t do</h2>
        <p>
          We don&rsquo;t sell or share your data, use it for advertising, or
          use it to train AI models. Use of information received from Google
          APIs adheres to the Google API Services User Data Policy, including
          the Limited Use requirements.
        </p>

        <h2 className="text-base font-semibold text-slate-900">Removing access and data</h2>
        <p>
          You can revoke access at any time at{" "}
          <a className="text-emerald-800 underline" href="https://myaccount.google.com/permissions">
            myaccount.google.com/permissions
          </a>
          . To have your stored data deleted, contact the app owner and it
          will be removed.
        </p>

        <p className="pt-4">
          <Link href="/login" className="font-medium text-emerald-800 underline">
            ← Back to sign in
          </Link>
        </p>
      </article>
    </main>
  );
}
