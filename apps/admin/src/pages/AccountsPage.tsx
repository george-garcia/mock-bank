import { useNavigate } from 'react-router-dom';
import { useAccounts } from '../hooks/useAccounts';
import { useAuthStore } from '../stores/auth';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/format';
import { Wallet, Snowflake, Sun, Ban, Receipt } from 'lucide-react';

const statusVariant = (s: string) => (s === 'active' ? 'success' : s === 'frozen' ? 'warning' : 'danger');

export function AccountsPage() {
  const navigate = useNavigate();
  const { accounts, isLoading, freeze, unfreeze, close, isMutating } = useAccounts();
  const isAdmin = useAuthStore((s) => s.staff?.role) === 'admin';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Wallet className="w-6 h-6 text-accent-light" />
        <h2 className="text-2xl font-display font-bold text-content">Accounts</h2>
        <Badge variant="default">{accounts.length}</Badge>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-content-muted">Loading accounts…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-content-subtle border-b border-white/5 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Account</th>
                <th className="px-6 py-4 font-semibold">Owner</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Balance</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-content">#{a.id}</td>
                  <td className="px-6 py-4 text-content-muted">{a.ownerFirstName} {a.ownerLastName}</td>
                  <td className="px-6 py-4 capitalize text-content-muted">{a.type}</td>
                  <td className="px-6 py-4"><Badge variant={statusVariant(a.status)}>{a.status}</Badge></td>
                  <td className="px-6 py-4 text-right font-mono text-content">{formatCurrency(a.balance)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/accounts/${a.id}`)} title="View transactions">
                        <Receipt className="w-4 h-4" />
                      </Button>
                      {a.status !== 'closed' && (
                        a.status === 'frozen' ? (
                          <Button size="sm" variant="secondary" disabled={isMutating} onClick={() => unfreeze.mutate(a.id)}>
                            <Sun className="w-3.5 h-3.5 mr-1.5" /> Unfreeze
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" disabled={isMutating} onClick={() => freeze.mutate(a.id)}>
                            <Snowflake className="w-3.5 h-3.5 mr-1.5" /> Freeze
                          </Button>
                        )
                      )}
                      {isAdmin && a.status !== 'closed' && (
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={isMutating}
                          onClick={() => { if (confirm(`Close account #${a.id}? This blocks all activity.`)) close.mutate(a.id); }}
                        >
                          <Ban className="w-3.5 h-3.5 mr-1.5" /> Close
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
