import { useQuery } from '@tanstack/react-query';
import { accountsApi, cardsApi } from '../lib/api';

export function useDashboard() {
  const { data: accountsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const { data: cardsData, isLoading: isLoadingCards } = useQuery({
    queryKey: ['cards'],
    queryFn: () => cardsApi.list(),
  });

  const accounts = accountsData || [];
  const cards = cardsData || [];

  const totalBalance = accounts.reduce((sum: number, acc: any) => sum + parseFloat(acc.balance), 0);
  const isLoading = isLoadingAccounts || isLoadingCards;

  return {
    accounts,
    cards,
    totalBalance,
    isLoading,
  };
}
