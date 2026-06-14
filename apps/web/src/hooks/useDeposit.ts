import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { depositsApi, accountsApi } from '../lib/api';

export function useDeposit() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    accountId: '',
    amount: '',
    description: '',
    instant: false,
  });
  const [result, setResult] = useState<any>(null);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const depositMutation = useMutation({
    mutationFn: depositsApi.simulate,
    onSuccess: (payload) => {
      setResult(payload);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setForm({ accountId: '', amount: '', description: '', instant: false });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountId || !form.amount) return;
    depositMutation.mutate({
      accountId: parseInt(form.accountId),
      amount: form.amount,
      description: form.description || undefined,
      instant: form.instant,
    });
  };

  return {
    accounts,
    form,
    setForm,
    result,
    handleSubmit,
    isSubmitting: depositMutation.isPending,
  };
}
