import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi, accountsApi } from '../lib/api';

export function useTransactions() {
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const { data: transactionsData, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['transactions', selectedAccount],
    queryFn: () => transactionsApi.list(parseInt(selectedAccount)),
    enabled: !!selectedAccount,
  });

  const accounts = accountsData || [];
  const transactions = transactionsData || [];

  return {
    accounts,
    transactions,
    selectedAccount,
    setSelectedAccount,
    isLoadingTransactions,
  };
}
