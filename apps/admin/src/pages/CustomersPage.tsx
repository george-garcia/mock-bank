import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../hooks/useCustomers';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatDate } from '../lib/format';
import { Users, ChevronRight } from 'lucide-react';

export function CustomersPage() {
  const navigate = useNavigate();
  const { customers, isLoading } = useCustomers();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-accent-light" />
        <h2 className="text-2xl font-display font-bold text-content">Customers</h2>
        <Badge variant="default">{customers.length}</Badge>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-content-muted">Loading customers…</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-content-muted">No customers found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-content-subtle border-b border-white/5 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">2FA</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-content">{c.firstName} {c.lastName}</td>
                  <td className="px-6 py-4 text-content-muted">{c.email}</td>
                  <td className="px-6 py-4">
                    {c.twoFactorMethod === 'none' ? (
                      <Badge variant="default">Off</Badge>
                    ) : (
                      <Badge variant="success">{c.twoFactorMethod.toUpperCase()}</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-content-muted">{formatDate(c.createdAt)}</td>
                  <td className="px-6 py-4 text-right"><ChevronRight className="w-4 h-4 text-content-subtle inline" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
