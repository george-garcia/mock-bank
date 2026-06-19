import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi, statementsApi } from '../lib/api';

function firstOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function useStatements() {
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Default the form to last month → this month.
  const now = new Date();
  const [period, setPeriod] = useState({
    periodStart: firstOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    periodEnd: firstOfMonth(now),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  // Pick the first account once accounts load.
  useEffect(() => {
    if (accountId === null && accounts.length > 0) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const { data: statements = [], isLoading } = useQuery({
    queryKey: ['statements', accountId],
    queryFn: () => statementsApi.list(accountId as number),
    enabled: accountId !== null,
  });

  const { data: selected } = useQuery({
    queryKey: ['statement', selectedId],
    queryFn: () => statementsApi.get(selectedId as number),
    enabled: selectedId !== null,
  });

  const generateMutation = useMutation({
    mutationFn: () => statementsApi.generate({ accountId: accountId as number, ...period }),
    onSuccess: (stmt) => {
      queryClient.invalidateQueries({ queryKey: ['statements', accountId] });
      setSelectedId(stmt.id);
    },
  });

  return {
    accounts,
    accountId,
    setAccountId,
    statements,
    isLoading,
    selected,
    selectedId,
    setSelectedId,
    period,
    setPeriod,
    generate: () => generateMutation.mutate(),
    isGenerating: generateMutation.isPending,
  };
}
