import { useQuery } from '@tanstack/react-query';
import { cardsApi } from '../../lib/api';
import { Badge } from '../ui/Badge';
import { Receipt, X } from 'lucide-react';

interface CardTransactionsModalProps {
  cardId: number;
  cardLastFour: string;
  onClose: () => void;
}

export function CardTransactionsModal({ cardId, cardLastFour, onClose }: CardTransactionsModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['card-transactions', cardId],
    queryFn: () => cardsApi.transactions(cardId),
  });

  const transactions = data?.data?.data || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-bank-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-bank-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Card Transactions</h3>
              <p className="text-sm text-gray-500">•••• {cardLastFour}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <p className="text-gray-500 text-center py-8">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No transactions on this card yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-bank-100 rounded-lg flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-bank-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {tx.merchantName || 'Unknown merchant'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(tx.createdAt).toLocaleDateString()} at {new Date(tx.createdAt).toLocaleTimeString()}
                      </p>
                      {tx.merchantCategory && (
                        <p className="text-xs text-gray-400">{tx.merchantCategory}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
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
