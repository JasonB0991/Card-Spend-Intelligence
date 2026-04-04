import ReviewTransactionCard from "@/components/ReviewTransactionCard";
import { getAppUrl } from "@/lib/app-url";

async function getReviewTransactions() {
  const res = await fetch(`${getAppUrl()}/api/...`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`Failed to fetch review queue: ${raw}`);
  }

  return res.json();
}

export default async function ReviewPage() {
  const transactions = await getReviewTransactions();

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Review Queue</h1>

      <div className="mb-6">
        <p className="text-sm text-gray-600">
          Review parsed transactions, confirm the product match, reject bad
          matches, or ignore entries.
        </p>
      </div>

      <div className="space-y-4">
        {transactions.length === 0 ? (
          <p>No transactions need review.</p>
        ) : (
          transactions.map((txn: any) => (
            <ReviewTransactionCard key={txn.id} txn={txn} />
          ))
        )}
      </div>
    </main>
  );
}