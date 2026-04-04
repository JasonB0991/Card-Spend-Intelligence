async function getEmails() {
  const res = await fetch("http://localhost:3000/api/emails", {
    cache: "no-store",
  });

  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`Failed to fetch emails: ${raw}`);
  }

  return res.json();
}

export default async function EmailsPage() {
  const emails = await getEmails();

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Raw Emails</h1>

      <div className="space-y-4">
        {emails.length === 0 ? (
          <p>No emails synced yet.</p>
        ) : (
          emails.map((email: any) => (
            <div key={email.id} className="border rounded-2xl p-4 shadow-sm">
              <p className="font-semibold">{email.subject || "(No subject)"}</p>
              <p className="text-sm text-gray-500">{email.from_email}</p>
              <p className="text-sm text-gray-500">
                {email.sent_at ? new Date(email.sent_at).toLocaleString() : "No date"}
              </p>
              <p className="mt-3 text-sm whitespace-pre-wrap">
                {(email.raw_text || "").slice(0, 500)}
              </p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}