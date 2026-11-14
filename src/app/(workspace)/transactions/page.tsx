import TransactionsPageClient from "@/components/TransactionsPageClient";
import { getCards, getSplits, getTransactions } from "@/lib/data";

export default async function TransactionsPage() {
  const [transactions, cards, splits] = await Promise.all([
    getTransactions(),
    getCards(),
    getSplits(),
  ]);

  return (
    <TransactionsPageClient
      transactions={transactions}
      cards={cards}
      splits={splits}
    />
  );
}
