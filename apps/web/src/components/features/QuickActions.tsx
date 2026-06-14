import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, X } from 'lucide-react';
import { DepositForm } from './DepositForm';
import { WithdrawalForm } from './WithdrawalForm';
import { TransferForm } from './TransferForm';

type ActionType = 'deposit' | 'withdraw' | 'transfer' | null;

export function QuickActions() {
  const [activeAction, setActiveAction] = useState<ActionType>(null);

  const actions = [
    { id: 'deposit' as ActionType, label: 'Deposit', icon: ArrowDownLeft, color: 'text-success-light bg-success/10 hover:bg-success/20 border border-success/20' },
    { id: 'withdraw' as ActionType, label: 'Withdraw', icon: ArrowUpRight, color: 'text-danger-light bg-danger/10 hover:bg-danger/20 border border-danger/20' },
    { id: 'transfer' as ActionType, label: 'Transfer', icon: ArrowLeftRight, color: 'text-primary-light bg-primary/10 hover:bg-primary/20 border border-primary/20' },
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
              className={`flex flex-col items-center gap-3 p-4 rounded-xl transition-all duration-200 ${
                activeAction === action.id
                  ? 'ring-2 ring-primary bg-surface-highlight border-transparent'
                  : action.color
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-sm font-semibold tracking-wide uppercase">{action.label}</span>
            </button>
          );
        })}
      </div>

      {activeAction && (
        <div className="relative animate-fade-in mt-6">
          <button
            onClick={() => setActiveAction(null)}
            className="absolute top-4 right-4 p-2 text-content-muted hover:text-content rounded-lg hover:bg-white/10 z-10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          {activeAction === 'deposit' && <DepositForm />}
          {activeAction === 'withdraw' && <WithdrawalForm />}
          {activeAction === 'transfer' && <TransferForm />}
        </div>
      )}
    </div>
  );
}
