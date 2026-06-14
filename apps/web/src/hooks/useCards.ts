import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cardsApi, accountsApi } from '../lib/api';

export function useCards() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCard, setSelectedCard] = useState<{ id: number; lastFour: string } | null>(null);
  const [newCard, setNewCard] = useState({ accountId: '', spendLimit: '', memo: '' });

  const { data: cardsData, isLoading: isLoadingCards } = useQuery({
    queryKey: ['cards'],
    queryFn: () => cardsApi.list(),
  });

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: cardsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      setShowCreate(false);
      setNewCard({ accountId: '', spendLimit: '', memo: '' });
    },
  });

  const freezeMutation = useMutation({
    mutationFn: cardsApi.freeze,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
  });

  const unfreezeMutation = useMutation({
    mutationFn: cardsApi.unfreeze,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: cardsApi.cancel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      accountId: parseInt(newCard.accountId),
      spendLimit: newCard.spendLimit || undefined,
      memo: newCard.memo || undefined,
    });
  };

  const cards = cardsData || [];
  const accounts = accountsData || [];

  return {
    cards,
    accounts,
    isLoadingCards,
    showCreate,
    setShowCreate,
    selectedCard,
    setSelectedCard,
    newCard,
    setNewCard,
    handleCreate,
    isCreating: createMutation.isPending,
    freezeMutation,
    unfreezeMutation,
    cancelMutation,
  };
}
