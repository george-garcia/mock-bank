import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { withdrawalsApi, accountsApi } from '../lib/api';

export function useWithdrawal() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    accountId: '',
    amount: '',
    description: '',
  });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const withdrawalMutation = useMutation({
    mutationFn: withdrawalsApi.create,
    onSuccess: (payload) => {
      setResult(payload);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setForm({ accountId: '', amount: '', description: '' });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Withdrawal failed');
      setResult(null);
    },
  });

  const selectedAccount = accounts.find((a: any) => a.id.toString() === form.accountId);
  const availableBalance = selectedAccount ? parseFloat(selectedAccount.balance) : 0;
  const withdrawAmount = parseFloat(form.amount || '0');
  const hasInsufficientFunds = withdrawAmount > availableBalance;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountId || !form.amount || hasInsufficientFunds) return;
    setError('');
    withdrawalMutation.mutate({
      accountId: parseInt(form.accountId),
      amount: form.amount,
      description: form.description || undefined,
    });
  };

  return {
    accounts,
    form,
    setForm,
    result,
    error,
    selectedAccount,
    availableBalance,
    hasInsufficientFunds,
    handleSubmit,
    isSubmitting: withdrawalMutation.isPending,
  };
}
