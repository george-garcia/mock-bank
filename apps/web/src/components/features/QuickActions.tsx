import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, X } from 'lucide-react';
import { DepositForm } from './DepositForm';
import { WithdrawalForm } from './WithdrawalForm';
import { TransferForm } from './TransferForm';

type ActionType = 'deposit' | 'withdraw' | 'transfer' | null;

export function QuickActions() {
  const [activeAction, setActiveAction] = useState<ActionType>(null);

  const actions = [
    { id: 'deposit' as ActionType, label: 'Deposit', icon: ArrowDownLeft, color: 'text-success-600 bg-success-50 hover:bg-success-100' },
    { id: 'withdraw' as ActionType, label: 'Withdraw', icon: ArrowUpRight, color: 'text-danger-600 bg-danger-50 hover:bg-danger-100' },
    { id: 'transfer' as ActionType, label: 'Transfer', icon: ArrowLeftRight, color: 'text-bank-600 bg-bank-50 hover:bg-bank-100' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => setActiveAction(activeAction === action.id ? null : action.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${
                activeAction === action.id
                  ? 'ring-2 ring-bank-500 bg-bank-50'
                  : action.color
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          );
        })}
      </div>

      {activeAction && (
        <div className="relative">
          <button
            onClick={() => setActiveAction(null)}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
          {activeAction === 'deposit' && <DepositForm />}
          {activeAction === 'withdraw' && <WithdrawalForm />}
          {activeAction === 'transfer' && <TransferForm />}
        </div>
      )}
    </div>
  );
}
