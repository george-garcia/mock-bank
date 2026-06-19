import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi } from '../lib/api';

export interface AccountRow {
  id: number;
  userId: number;
  type: string;
  status: 'active' | 'frozen' | 'closed';
  createdAt: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  balance: string;
}

export function useAccounts() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<AccountRow[]>({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['accounts'] });
  const freeze = useMutation({ mutationFn: accountsApi.freeze, onSuccess: invalidate });
  const unfreeze = useMutation({ mutationFn: accountsApi.unfreeze, onSuccess: invalidate });
  const close = useMutation({ mutationFn: accountsApi.close, onSuccess: invalidate });

  return {
    accounts: data || [],
    isLoading,
    freeze,
    unfreeze,
    close,
    isMutating: freeze.isPending || unfreeze.isPending || close.isPending,
  };
}
