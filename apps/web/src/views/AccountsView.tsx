import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Wallet, Plus } from 'lucide-react';

interface AccountsViewProps {
  accounts: any[];
  isLoading: boolean;
  showCreate: boolean;
  setShowCreate: (v: boolean) => void;
  newAccount: { type: 'checking' | 'savings', label: string };
  setNewAccount: (v: any) => void;
  handleCreate: (e: React.FormEvent) => void;
  isCreating: boolean;
}

export function AccountsView({
  accounts,
  isLoading,
  showCreate,
  setShowCreate,
  newAccount,
  setNewAccount,
  handleCreate,
  isCreating
}: AccountsViewProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-content tracking-tight">Accounts</h2>
          <p className="text-content-muted mt-1">Manage your bank accounts and balances</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="shadow-[0_0_15px_rgba(59,130,246,0.3)]">
          <Plus className="w-5 h-5 mr-2" />
          New Account
        </Button>
      </div>

      {showCreate && (
        <div className="animate-slide-up">
          <Card className="border-primary/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
            <CardHeader>
              <CardTitle>Create New Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label-modern">Account Type</label>
                    <div className="relative">
                      <select
                        className="input-glass appearance-none cursor-pointer"
                        value={newAccount.type}
                        onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value as 'checking' | 'savings' })}
                      >
                        <option value="checking" className="bg-surface text-content">Checking</option>
                        <option value="savings" className="bg-surface text-content">Savings</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-content-muted">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="label-modern">Label (optional)</label>
                    <input
                      className="input-glass"
                      value={newAccount.label}
                      onChange={(e) => setNewAccount({ ...newAccount, label: e.target.value })}
                      placeholder="e.g. Vacation Fund"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" isLoading={isCreating}>
                    Create Account
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 flex justify-center animate-pulse-slow">
            <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="col-span-full">
            <Card className="border-dashed border-2 border-white/10 bg-transparent shadow-none hover:border-primary/30 transition-colors">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-surface-highlight rounded-full flex items-center justify-center mx-auto mb-6">
                  <Wallet className="w-10 h-10 text-content-subtle" />
                </div>
                <h3 className="text-xl font-display font-semibold text-content mb-2">No accounts yet</h3>
                <p className="text-content-muted max-w-sm mx-auto mb-6">Create your first checking or savings account to start managing your money.</p>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="w-5 h-5 mr-2" />
                  Create your first account
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          accounts.map((account: any, index: number) => (
            <div key={account.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
              <Card className="h-full hover:-translate-y-1 transition-transform duration-300">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                        <Wallet className="w-6 h-6 text-primary-light" />
                      </div>
                      <div>
                        <p className="font-semibold text-content capitalize">
                          {account.type} Account
                        </p>
                        <p className="text-xs text-content-muted mt-1 font-mono">
                          {account.label || `AC-${String(account.id).padStart(4, '0')}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={account.status === 'active' ? 'success' : 'warning'}>
                      {account.status}
                    </Badge>
                  </div>
                  <div className="mt-auto pt-4 border-t border-white/5">
                    <p className="text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">Available Balance</p>
                    <p className="text-3xl font-display font-bold text-content flex items-baseline gap-1">
                      <span className="text-primary-light text-xl">$</span>
                      {parseFloat(account.balance).toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
