import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CardTransactionsModal } from '../components/features/CardTransactionsModal';
import { CreditCard, Plus, Snowflake, RotateCcw, XCircle, Receipt, Eye, EyeOff } from 'lucide-react';

interface RevealedCard { cardNumber: string; cvv: string; expiryMonth: string; expiryYear: string }

interface CardsViewProps {
  cards: any[];
  accounts: any[];
  isLoadingCards: boolean;
  showCreate: boolean;
  setShowCreate: (v: boolean) => void;
  selectedCard: { id: number; lastFour: string } | null;
  setSelectedCard: (v: any) => void;
  newCard: { accountId: string; spendLimit: string; memo: string };
  setNewCard: (v: any) => void;
  handleCreate: (e: React.FormEvent) => void;
  isCreating: boolean;
  freezeMutation: any;
  unfreezeMutation: any;
  cancelMutation: any;
  revealed: Record<number, RevealedCard>;
  revealCard: (id: number) => void;
  hideCard: (id: number) => void;
  revealingId: number | null;
}

const groupPan = (pan: string) => pan.replace(/(.{4})/g, '$1 ').trim();

export function CardsView({
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
  isCreating,
  freezeMutation,
  unfreezeMutation,
  cancelMutation,
  revealed,
  revealCard,
  hideCard,
  revealingId,
}: CardsViewProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-content tracking-tight">Cards</h2>
          <p className="text-content-muted mt-1">Manage your virtual cards and spending limits</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="shadow-[0_0_15px_rgba(139,92,246,0.3)] bg-accent hover:bg-accent-dark hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] border-accent-light/30">
          <Plus className="w-5 h-5 mr-2" />
          Issue Card
        </Button>
      </div>

      {showCreate && (
        <div className="animate-slide-up">
          <Card className="border-accent/30 shadow-[0_0_30px_rgba(139,92,246,0.1)]">
            <CardHeader>
              <CardTitle>Issue Virtual Card</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <div>
                    <label className="label-modern">Linked Account</label>
                    <div className="relative">
                      <select
                        className="input-glass appearance-none cursor-pointer"
                        value={newCard.accountId}
                        onChange={(e) => setNewCard({ ...newCard, accountId: e.target.value })}
                        required
                      >
                        <option value="" className="bg-surface text-content">Select account</option>
                        {accounts.map((account: any) => (
                          <option key={account.id} value={account.id} className="bg-surface text-content">
                            {account.label || `${account.type} #${account.id}`} — ${parseFloat(account.balance).toFixed(2)}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-content-muted">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="label-modern">Spend Limit (optional)</label>
                    <input
                      className="input-glass"
                      type="number"
                      step="0.01"
                      value={newCard.spendLimit}
                      onChange={(e) => setNewCard({ ...newCard, spendLimit: e.target.value })}
                      placeholder="e.g. 1000.00"
                    />
                  </div>
                  <div>
                    <label className="label-modern">Memo (optional)</label>
                    <input
                      className="input-glass"
                      value={newCard.memo}
                      onChange={(e) => setNewCard({ ...newCard, memo: e.target.value })}
                      placeholder="e.g. Online shopping card"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" isLoading={isCreating} className="bg-accent hover:bg-accent-dark hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] focus:ring-accent border-accent-light/30">
                    Issue Card
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {isLoadingCards ? (
          <div className="col-span-full py-12 flex justify-center animate-pulse-slow">
            <div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
          </div>
        ) : cards.length === 0 ? (
          <div className="col-span-full">
            <Card className="border-dashed border-2 border-white/10 bg-transparent shadow-none hover:border-accent/30 transition-colors">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-surface-highlight rounded-full flex items-center justify-center mx-auto mb-6">
                  <CreditCard className="w-10 h-10 text-content-subtle" />
                </div>
                <h3 className="text-xl font-display font-semibold text-content mb-2">No active cards</h3>
                <p className="text-content-muted max-w-sm mx-auto mb-6">Issue a secure virtual card linked to your account for safe online spending.</p>
                <Button onClick={() => setShowCreate(true)} className="bg-accent hover:bg-accent-dark">
                  <Plus className="w-5 h-5 mr-2" />
                  Issue Virtual Card
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          cards.map((card: any, index: number) => (
            <div key={card.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
              <Card className="h-full hover:border-accent/30 transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center border border-accent/20 group-hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all">
                        <CreditCard className="w-6 h-6 text-accent-light" />
                      </div>
                      <div>
                        <p className="font-semibold text-content font-mono tracking-widest text-lg">•••• {card.lastFour}</p>
                        <p className="text-xs text-content-muted mt-1">
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

                  <div className="mb-6 p-4 bg-gradient-to-br from-black to-surface-highlight border border-white/10 rounded-xl relative overflow-hidden shadow-inner">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                    <p className="text-white font-mono text-xl tracking-[0.2em] relative z-10 drop-shadow-md select-all">
                      {revealed[card.id] ? groupPan(revealed[card.id].cardNumber) : `•••• •••• •••• ${card.lastFour}`}
                    </p>
                    <div className="flex justify-between mt-4 relative z-10">
                      <p className="text-content-muted text-xs font-semibold tracking-widest uppercase">
                        <span className="opacity-50 mr-1">EXP</span> {card.expiryMonth}/{card.expiryYear}
                      </p>
                      <p className="text-content-muted text-xs font-semibold tracking-widest uppercase select-all">
                        <span className="opacity-50 mr-1">CVV</span> {revealed[card.id] ? revealed[card.id].cvv : '***'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                    {card.status === 'active' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => freezeMutation.mutate(card.id)}
                        isLoading={freezeMutation.isPending}
                      >
                        <Snowflake className="w-4 h-4 mr-1.5" />
                        Freeze
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCard({ id: card.id, lastFour: card.lastFour })}
                    >
                      <Receipt className="w-4 h-4 mr-1.5" />
                      Transactions
                    </Button>
                    {card.status !== 'cancelled' && (
                      revealed[card.id] ? (
                        <Button variant="ghost" size="sm" onClick={() => hideCard(card.id)}>
                          <EyeOff className="w-4 h-4 mr-1.5" />
                          Hide details
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revealCard(card.id)}
                          isLoading={revealingId === card.id}
                        >
                          <Eye className="w-4 h-4 mr-1.5" />
                          Show details
                        </Button>
                      )
                    )}
                    {card.status === 'frozen' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => unfreezeMutation.mutate(card.id)}
                        isLoading={unfreezeMutation.isPending}
                      >
                        <RotateCcw className="w-4 h-4 mr-1.5" />
                        Unfreeze
                      </Button>
                    )}
                    {card.status !== 'cancelled' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => cancelMutation.mutate(card.id)}
                        isLoading={cancelMutation.isPending}
                        className="ml-auto"
                      >
                        <XCircle className="w-4 h-4 mr-1.5" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
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
