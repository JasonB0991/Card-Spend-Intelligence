import AddCardForm from "@/components/AddCardForm";
import CardRow from "@/components/CardRow";
import { getAppUrl } from "@/lib/app-url";

async function getCards() {
  const res = await fetch(`${getAppUrl()}/api/...`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`Failed to fetch cards: ${raw}`);
  }

  return res.json();
}

export default async function CardsPage() {
  const cards = await getCards();

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Cards</h1>

      <AddCardForm />

      <div className="space-y-4">
        {cards.length === 0 ? (
          <p>No cards added yet.</p>
        ) : (
          cards.map((card: any) => <CardRow key={card.id} card={card} />)
        )}
      </div>
    </main>
  );
}