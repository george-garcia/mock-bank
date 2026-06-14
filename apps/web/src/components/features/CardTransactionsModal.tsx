import { useCardTransactions } from '../../hooks/useCardTransactions';
import { Badge } from '../ui/Badge';
import { Receipt, X } from 'lucide-react';

interface CardTransactionsModalProps {
  cardId: number;
  cardLastFour: string;
  onClose: () => void;
}

export function CardTransactionsModal({ cardId, cardLastFour, onClose }: CardTransactionsModalProps) {
  const { transactions, isLoading } = useCardTransactions(cardId);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-surface border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-slide-up">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-surface-highlight/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center border border-accent/20 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
              <Receipt className="w-6 h-6 text-accent-light" />
            </div>
            <div>
              <h3 className="text-xl font-display font-semibold text-content">Card Transactions</h3>
              <p className="text-sm text-content-muted font-mono mt-0.5">•••• {cardLastFour}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-content-muted hover:text-content hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] bg-surface">
          {isLoading ? (
            <div className="py-12 flex justify-center animate-pulse-slow">
              <div className="w-10 h-10 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-surface-highlight rounded-full flex items-center justify-center mx-auto mb-6">
                <Receipt className="w-10 h-10 text-content-subtle" />
              </div>
              <p className="text-content-muted text-lg font-medium">No transactions on this card yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx: any, index: number) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-5 bg-surface-highlight/50 hover:bg-surface-highlight border border-white/5 rounded-xl transition-all animate-slide-up"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center border border-accent/10">
                      <Receipt className="w-5 h-5 text-accent-light" />
                    </div>
                    <div>
                      <p className="font-semibold text-content text-lg">
                        {tx.merchantName || 'Unknown merchant'}
                      </p>
                      <p className="text-sm text-content-muted font-mono mt-1">
                        {new Date(tx.createdAt).toLocaleDateString()} at {new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                      {tx.merchantCategory && (
                        <p className="text-xs text-accent-light/70 mt-1 uppercase tracking-wider font-semibold">{tx.merchantCategory}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-xl text-content mb-2">
                      -${parseFloat(tx.amount).toFixed(2)}
                    </p>
                    <Badge
                      variant={
                        tx.status === 'approved'
                          ? 'success'
                          : tx.status === 'declined'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
