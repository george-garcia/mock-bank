import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ArrowLeftRight, Wallet } from 'lucide-react';

interface TransactionsViewProps {
  accounts: any[];
  transactions: any[];
  selectedAccount: string;
  setSelectedAccount: (v: string) => void;
  isLoadingTransactions: boolean;
}

export function TransactionsView({
  accounts,
  transactions,
  selectedAccount,
  setSelectedAccount,
  isLoadingTransactions
}: TransactionsViewProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-display font-bold text-content tracking-tight">Transactions</h2>
        <p className="text-content-muted mt-1">View your transaction history across accounts</p>
      </div>

      <div className="max-w-md animate-slide-up">
        <label className="label-modern">Select Account</label>
        <div className="relative">
          <select
            className="input-glass appearance-none cursor-pointer text-lg py-4"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            <option value="" className="bg-surface text-content">Choose an account</option>
            {accounts.map((account: any) => (
              <option key={account.id} value={account.id} className="bg-surface text-content">
                {account.label || `${account.type} #${account.id}`} — ${parseFloat(account.balance).toFixed(2)}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-content-muted">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      <Card className="animate-slide-up border-primary/20" style={{ animationDelay: '0.1s' }}>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedAccount ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-surface-highlight rounded-full flex items-center justify-center mx-auto mb-6">
                <ArrowLeftRight className="w-10 h-10 text-content-subtle" />
              </div>
              <p className="text-content-muted text-lg">Select an account above to view its transactions</p>
            </div>
          ) : isLoadingTransactions ? (
            <div className="py-16 flex justify-center animate-pulse-slow">
              <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-surface-highlight rounded-full flex items-center justify-center mx-auto mb-6">
                <Wallet className="w-10 h-10 text-content-subtle" />
              </div>
              <h3 className="text-xl font-display font-semibold text-content mb-2">No transactions yet</h3>
              <p className="text-content-muted">This account hasn't had any activity.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx: any, index: number) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-5 bg-surface-highlight/50 hover:bg-surface-highlight border border-white/5 rounded-xl transition-all group animate-slide-up"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                      ['deposit', 'transfer', 'ach_credit', 'return'].includes(tx.type)
                        ? 'bg-success/10 border border-success/20'
                        : 'bg-danger/10 border border-danger/20'
                    }`}>
                      <ArrowLeftRight className={`w-5 h-5 ${
                        ['deposit', 'transfer', 'ach_credit', 'return'].includes(tx.type)
                          ? 'text-success-light'
                          : 'text-danger-light'
                      }`} />
                    </div>
                    <div>
                      <p className="font-semibold text-content capitalize text-lg">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-sm text-content-muted mt-1 font-mono">
                        {new Date(tx.createdAt).toLocaleDateString()} at {new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-display font-bold text-xl mb-1 ${
                      ['deposit', 'transfer', 'ach_credit', 'return'].includes(tx.type)
                        ? 'text-success-light'
                        : 'text-danger-light'
                    }`}>
                      {['deposit', 'transfer', 'ach_credit', 'return'].includes(tx.type) ? '+' : '-'}${Math.abs(parseFloat(tx.amount)).toFixed(2)}
                    </p>
                    <Badge variant={tx.status === 'completed' ? 'success' : 'warning'}>
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
