import DashboardClient from "@/components/DashboardClient";
import { getAppUrl } from "@/lib/app-url";

async function getTransactions() {
  const res = await fetch(`${getAppUrl()}/api/transactions`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`Failed to fetch transactions: ${raw}`);
  }

  return res.json();
}

async function getCards() {
  const res = await fetch("http://localhost:3000/api/cards", {
    cache: "no-store",
  });

  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`Failed to fetch cards: ${raw}`);
  }

  return res.json();
}

async function getSplits() {
  const res = await fetch("http://localhost:3000/api/splits", {
    cache: "no-store",
  });

  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`Failed to fetch splits: ${raw}`);
  }

  return res.json();
}

export default async function DashboardPage() {
  const [transactions, cards, splits] = await Promise.all([
    getTransactions(),
    getCards(),
    getSplits(),
  ]);

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <DashboardClient
        transactions={transactions}
        cards={cards}
        splits={splits}
      />
    </main>
  );
}