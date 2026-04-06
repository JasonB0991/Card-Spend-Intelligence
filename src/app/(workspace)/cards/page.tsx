import CardsClient from "@/components/CardsClient";
import { getAppUrl } from "@/lib/app-url";

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

export default async function CardsPage() {
  const cards = await getCards();

  return <CardsClient cards={cards} />;
}