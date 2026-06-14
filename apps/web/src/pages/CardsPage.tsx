import { useCards } from '../hooks/useCards';
import { CardsView } from '../views/CardsView';

export function CardsPage() {
  const cardsData = useCards();
  return <CardsView {...cardsData} />;
}
