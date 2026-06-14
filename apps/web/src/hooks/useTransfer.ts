import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transfersApi, accountsApi } from '../lib/api';

export function useTransfer() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    description: '',
  });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const transferMutation = useMutation({
    mutationFn: transfersApi.create,
    onSuccess: (payload) => {
      setResult(payload);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setForm({ fromAccountId: '', toAccountId: '', amount: '', description: '' });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Transfer failed');
      setResult(null);
    },
  });

  const fromAccount = accounts.find((a: any) => a.id.toString() === form.fromAccountId);
  const availableBalance = fromAccount ? parseFloat(fromAccount.balance) : 0;
  const transferAmount = parseFloat(form.amount || '0');
  const hasInsufficientFunds = transferAmount > availableBalance;
  const sameAccount = !!form.fromAccountId && form.fromAccountId === form.toAccountId;
  const filteredToAccounts = accounts.filter((a: any) => a.id.toString() !== form.fromAccountId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fromAccountId || !form.toAccountId || !form.amount || hasInsufficientFunds || sameAccount) return;
    setError('');
    transferMutation.mutate({
      fromAccountId: parseInt(form.fromAccountId),
      toAccountId: parseInt(form.toAccountId),
      amount: form.amount,
      description: form.description || undefined,
    });
  };

  return {
    accounts,
    filteredToAccounts,
    form,
    setForm,
    result,
    error,
    availableBalance,
    hasInsufficientFunds,
    sameAccount,
    handleSubmit,
    isSubmitting: transferMutation.isPending,
  };
}
