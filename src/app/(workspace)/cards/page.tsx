import CardsClient from "@/components/CardsClient";
import { getCards } from "@/lib/data";

export default async function CardsPage() {
  const cards = await getCards();

  return <CardsClient cards={cards} />;
}
