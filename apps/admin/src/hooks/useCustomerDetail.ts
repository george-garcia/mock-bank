import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../lib/api';

export interface CustomerAccount {
  id: number;
  type: string;
  status: 'active' | 'frozen' | 'closed';
  balance: string;
  createdAt: string;
}

export interface CustomerDetail {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  twoFactorMethod: string;
  createdAt: string;
  accounts: CustomerAccount[];
}

export function useCustomerDetail(id: number) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<CustomerDetail>({
    queryKey: ['customer', id],
    queryFn: () => customersApi.get(id),
    enabled: !!id,
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });

  useEffect(() => {
    if (data) setForm({ firstName: data.firstName, lastName: data.lastName, email: data.email });
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (d: { firstName: string; lastName: string; email: string }) => customersApi.update(id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setEditing(false);
    },
  });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  return {
    customer: data,
    isLoading,
    editing,
    setEditing,
    form,
    setForm,
    save,
    isSaving: updateMutation.isPending,
    saveError: (updateMutation.error as any)?.response?.data?.message as string | undefined,
  };
}
