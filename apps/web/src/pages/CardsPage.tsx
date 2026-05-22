import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cardsApi, accountsApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CardTransactionsModal } from '../components/features/CardTransactionsModal';
import { CreditCard, Plus, Snowflake, RotateCcw, XCircle, Receipt } from 'lucide-react';

export function CardsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCard, setSelectedCard] = useState<{ id: number; lastFour: string } | null>(null);
  const [newCard, setNewCard] = useState({ accountId: '', spendLimit: '', memo: '' });

  const { data: cardsData } = useQuery({
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

  const cards = cardsData?.data?.data || [];
  const accounts = accountsData?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cards</h2>
          <p className="text-gray-500">Manage your virtual cards</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Card
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Issue Virtual Card</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  accountId: parseInt(newCard.accountId),
                  spendLimit: newCard.spendLimit || undefined,
                  memo: newCard.memo || undefined,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="label">Linked Account</label>
                <select
                  className="input"
                  value={newCard.accountId}
                  onChange={(e) => setNewCard({ ...newCard, accountId: e.target.value })}
                  required
                >
                  <option value="">Select account</option>
                  {accounts.map((account: any) => (
                    <option key={account.id} value={account.id}>
                      {account.label || `${account.type} #${account.id}`} — ${parseFloat(account.balance).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Spend Limit (optional)</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={newCard.spendLimit}
                  onChange={(e) => setNewCard({ ...newCard, spendLimit: e.target.value })}
                  placeholder="1000.00"
                />
              </div>
              <div>
                <label className="label">Memo (optional)</label>
                <input
                  className="input"
                  value={newCard.memo}
                  onChange={(e) => setNewCard({ ...newCard, memo: e.target.value })}
                  placeholder="e.g. Online shopping card"
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" isLoading={createMutation.isPending}>
                  Issue Card
                </Button>
                <Button variant="secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No cards yet. Issue your first virtual card.</p>
            </CardContent>
          </Card>
        ) : (
          cards.map((card: any) => (
            <Card key={card.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-bank-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-bank-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">•••• {card.lastFour}</p>
                      <p className="text-sm text-gray-500">
                        Expires {card.expiryMonth}/{card.expiryYear}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      card.status === 'active'
                        ? 'success'
                        : card.status === 'frozen'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {card.status}
                  </Badge>
                </div>

                {card.cardNumber && (
                  <div className="mt-4 p-3 bg-gray-900 rounded-lg">
                    <p className="text-white font-mono text-lg tracking-wider">
                      {card.cardNumber}
                    </p>
                    <div className="flex justify-between mt-2">
                      <p className="text-gray-400 text-sm">
                        {card.expiryMonth}/{card.expiryYear}
                      </p>
                      <p className="text-gray-400 text-sm">CVV: ***</p>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  {card.status === 'active' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => freezeMutation.mutate(card.id)}
                      isLoading={freezeMutation.isPending}
                    >
                      <Snowflake className="w-4 h-4 mr-1" />
                      Freeze
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCard({ id: card.id, lastFour: card.lastFour })}
                  >
                    <Receipt className="w-4 h-4 mr-1" />
                    Transactions
                  </Button>
                  {card.status === 'frozen' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => unfreezeMutation.mutate(card.id)}
                      isLoading={unfreezeMutation.isPending}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Unfreeze
                    </Button>
                  )}
                  {card.status !== 'cancelled' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => cancelMutation.mutate(card.id)}
                      isLoading={cancelMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {selectedCard && (
        <CardTransactionsModal
          cardId={selectedCard.id}
          cardLastFour={selectedCard.lastFour}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}
