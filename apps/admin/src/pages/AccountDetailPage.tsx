import { useParams, useNavigate } from 'react-router-dom';
import { useAccountDetail } from '../hooks/useAccountDetail';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDateTime } from '../lib/format';
import { ArrowLeft } from 'lucide-react';

const statusVariant = (s: string) => (s === 'active' ? 'success' : s === 'frozen' ? 'warning' : 'danger');

export function AccountDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account, transactions, isLoading } = useAccountDetail(Number(id));

  if (isLoading) return <div className="p-8 text-content-muted">Loading…</div>;
  if (!account) return <div className="p-8 text-content-muted">Account not found.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={() => navigate('/accounts')} className="flex items-center gap-2 text-sm text-content-muted hover:text-content transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to accounts
      </button>

      <Card>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-display font-bold text-content">Account #{account.id}</h2>
              <Badge variant={statusVariant(account.status)}>{account.status}</Badge>
            </div>
            <p className="text-content-muted capitalize mt-1">{account.type}</p>
          </div>
          <div className="text-right">
            <div className="label-modern">Posted balance</div>
            <div className="text-3xl font-display font-bold text-content font-mono">{formatCurrency(account.balance)}</div>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-white/5">
          <h3 className="text-lg font-display font-semibold text-content">Transaction history</h3>
          <p className="text-xs text-content-subtle mt-1">Read-only — derived from the immutable ledger.</p>
        </div>
        {transactions.length === 0 ? (
          <div className="p-6 text-content-muted text-sm">No transactions.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-content-subtle border-b border-white/5 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold">Description</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const negative = t.amount.startsWith('-');
                return (
                  <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-content-muted whitespace-nowrap">{formatDateTime(t.createdAt)}</td>
                    <td className="px-6 py-4 capitalize text-content-muted">{t.type.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 text-content">{t.description || '—'}</td>
                    <td className="px-6 py-4">
                      <Badge variant={t.status === 'reversed' ? 'danger' : 'default'}>{t.status}</Badge>
                    </td>
                    <td className={`px-6 py-4 text-right font-mono font-medium ${negative ? 'text-danger-light' : 'text-success-light'}`}>
                      {negative ? '' : '+'}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
