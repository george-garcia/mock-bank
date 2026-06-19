import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCustomerDetail } from '../hooks/useCustomerDetail';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/format';
import { ArrowLeft, Pencil } from 'lucide-react';

const statusVariant = (s: string) => (s === 'active' ? 'success' : s === 'frozen' ? 'warning' : 'danger');

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customer, isLoading, editing, setEditing, form, setForm, save, isSaving, saveError } = useCustomerDetail(Number(id));

  if (isLoading) return <div className="p-8 text-content-muted">Loading…</div>;
  if (!customer) return <div className="p-8 text-content-muted">Customer not found.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={() => navigate('/customers')} className="flex items-center gap-2 text-sm text-content-muted hover:text-content transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to customers
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Profile</CardTitle>
            {!editing && (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editing ? (
              <form onSubmit={save} className="space-y-4">
                <Input label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                <Input label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                {saveError && <p className="text-sm text-danger-light">{saveError}</p>}
                <div className="flex gap-2">
                  <Button type="submit" isLoading={isSaving} className="bg-accent hover:bg-accent-dark">Save</Button>
                  <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="label-modern">Name</dt>
                  <dd className="text-content">{customer.firstName} {customer.lastName}</dd>
                </div>
                <div>
                  <dt className="label-modern">Email</dt>
                  <dd className="text-content">{customer.email}</dd>
                </div>
                <div>
                  <dt className="label-modern">Two-factor</dt>
                  <dd>{customer.twoFactorMethod === 'none' ? <Badge>Off</Badge> : <Badge variant="success">{customer.twoFactorMethod.toUpperCase()}</Badge>}</dd>
                </div>
                <div>
                  <dt className="label-modern">Customer since</dt>
                  <dd className="text-content-muted">{formatDate(customer.createdAt)}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        {/* Accounts */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-white/5">
            <CardTitle>Accounts</CardTitle>
          </div>
          {customer.accounts.length === 0 ? (
            <div className="p-6 text-content-muted text-sm">No accounts.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-content-subtle border-b border-white/5 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 font-semibold">Account</th>
                  <th className="px-6 py-3 font-semibold">Type</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {customer.accounts.map((a) => (
                  <tr key={a.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <Link to={`/accounts/${a.id}`} className="text-primary-light hover:underline font-medium">#{a.id}</Link>
                    </td>
                    <td className="px-6 py-4 capitalize text-content-muted">{a.type}</td>
                    <td className="px-6 py-4"><Badge variant={statusVariant(a.status)}>{a.status}</Badge></td>
                    <td className="px-6 py-4 text-right font-mono text-content">{formatCurrency(a.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
