import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffApi } from '../lib/api';

export interface StaffRow {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'auditor';
}

const EMPTY = { email: '', password: '', firstName: '', lastName: '', role: 'auditor' as 'admin' | 'auditor' };

export function useStaff() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<StaffRow[]>({ queryKey: ['staff'], queryFn: () => staffApi.list() });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const createMutation = useMutation({
    mutationFn: staffApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setShowCreate(false);
      setForm(EMPTY);
    },
  });

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  return {
    staff: data || [],
    isLoading,
    showCreate,
    setShowCreate,
    form,
    setForm,
    create,
    isCreating: createMutation.isPending,
    createError: (createMutation.error as any)?.response?.data?.message as string | undefined,
  };
}
