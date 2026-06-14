import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi } from '../lib/api';

export function useAccounts() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newAccount, setNewAccount] = useState({ type: 'checking' as 'checking' | 'savings', label: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setShowCreate(false);
      setNewAccount({ type: 'checking', label: '' });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newAccount);
  };

  const accounts = data || [];

  return {
    accounts,
    isLoading,
    showCreate,
    setShowCreate,
    newAccount,
    setNewAccount,
    handleCreate,
    isCreating: createMutation.isPending,
  };
}
