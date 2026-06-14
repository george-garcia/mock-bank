import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { QuickActions } from '../components/features/QuickActions';
import { Wallet, CreditCard, ArrowUpRight, Activity } from 'lucide-react';

interface DashboardViewProps {
  accounts: any[];
  cards: any[];
  totalBalance: number;
  isLoading: boolean;
}

export function DashboardView({ accounts, cards, totalBalance, isLoading }: DashboardViewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-pulse-slow flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-content-muted font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-content tracking-tight">Overview</h2>
          <p className="text-content-muted mt-1">Welcome to your financial hub.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-success/10 border border-success/20 rounded-full">
          <Activity className="w-4 h-4 text-success" />
          <span className="text-sm font-medium text-success-light">All systems operational</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-surface to-surface-highlight border-t-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-content-muted uppercase tracking-wider">Total Balance</p>
                <p className="text-4xl font-display font-bold text-content mt-2 flex items-baseline gap-1">
                  <span className="text-primary-light text-2xl">$</span>
                  {totalBalance.toFixed(2)}
                </p>
              </div>
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]">
                <Wallet className="w-7 h-7 text-primary-light" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-content-muted uppercase tracking-wider">Active Accounts</p>
                <p className="text-4xl font-display font-bold text-content mt-2">
                  {accounts.length}
                </p>
              </div>
              <div className="w-14 h-14 bg-success/10 rounded-2xl flex items-center justify-center border border-success/20">
                <ArrowUpRight className="w-7 h-7 text-success-light" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-content-muted uppercase tracking-wider">Active Cards</p>
                <p className="text-4xl font-display font-bold text-content mt-2">
                  {cards.length}
                </p>
              </div>
              <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center border border-accent/20">
                <CreditCard className="w-7 h-7 text-accent-light" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <QuickActions />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        {/* Accounts List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-16 h-16 mx-auto bg-surface-highlight rounded-full flex items-center justify-center mb-4">
                  <Wallet className="w-8 h-8 text-content-subtle" />
                </div>
                <p className="text-content-muted text-sm">No accounts yet. Create one to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {accounts.map((account: any) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 bg-surface-highlight/50 hover:bg-surface-highlight border border-white/5 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/10 group-hover:border-primary/30 transition-colors">
                        <Wallet className="w-6 h-6 text-primary-light" />
                      </div>
                      <div>
                        <p className="font-semibold text-content capitalize">
                          {account.type} Account
                        </p>
                        <p className="text-xs text-content-muted mt-0.5">
                          {account.label || `Account ending in ${String(account.id).slice(-4)}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-lg text-content">
                        ${parseFloat(account.balance).toFixed(2)}
                      </p>
                      <div className="mt-1">
                        <Badge variant={account.status === 'active' ? 'success' : 'warning'}>
                          {account.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Cards */}
        {cards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cards.map((card: any) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-4 bg-surface-highlight/50 hover:bg-surface-highlight border border-white/5 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center border border-accent/10 group-hover:border-accent/30 transition-colors">
                        <CreditCard className="w-6 h-6 text-accent-light" />
                      </div>
                      <div>
                        <p className="font-semibold text-content font-mono tracking-widest">
                          •••• {card.lastFour}
                        </p>
                        <p className="text-xs text-content-muted mt-0.5">
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
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
