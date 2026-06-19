import { useQuery } from '@tanstack/react-query';
import { accountsApi } from '../lib/api';

export interface AccountInfo {
  id: number;
  userId: number;
  type: string;
  status: 'active' | 'frozen' | 'closed';
  balance: string;
  createdAt: string;
}

export interface TxnRow {
  id: number;
  transactionId: number;
  type: string;
  amount: string; // signed decimal string
  description: string | null;
  status: string;
  createdAt: string;
}

export function useAccountDetail(id: number) {
  const account = useQuery<AccountInfo>({
    queryKey: ['account', id],
    queryFn: () => accountsApi.get(id),
    enabled: !!id,
  });
  const txns = useQuery<TxnRow[]>({
    queryKey: ['account-txns', id],
    queryFn: () => accountsApi.transactions(id),
    enabled: !!id,
  });

  return {
    account: account.data,
    transactions: txns.data || [],
    isLoading: account.isLoading || txns.isLoading,
  };
}
