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
  const res = await fetch(`${getAppUrl()}/api/cards`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`Failed to fetch cards: ${raw}`);
  }

  return res.json();
}

async function getSplits() {
  const res = await fetch(`${getAppUrl()}/api/splits`, {
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
    <DashboardClient
      transactions={transactions}
      cards={cards}
      splits={splits}
    />
  );
}