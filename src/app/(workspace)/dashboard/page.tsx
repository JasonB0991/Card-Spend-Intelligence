import DashboardClient from "@/components/DashboardClient";
import { getCards, getSplits, getTransactions } from "@/lib/data";

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
