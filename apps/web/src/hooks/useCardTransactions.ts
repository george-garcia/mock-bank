import { useQuery } from '@tanstack/react-query';
import { cardsApi } from '../lib/api';

export function useCardTransactions(cardId: number) {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['card-transactions', cardId],
    queryFn: () => cardsApi.transactions(cardId),
  });

  return { transactions, isLoading };
}
