import { useStaff } from '../hooks/useStaff';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ShieldCheck, Plus } from 'lucide-react';

export function StaffPage() {
  const { staff, isLoading, showCreate, setShowCreate, form, setForm, create, isCreating, createError } = useStaff();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-accent-light" />
          <h2 className="text-2xl font-display font-bold text-content">Staff</h2>
          <Badge variant="default">{staff.length}</Badge>
        </div>
        {!showCreate && (
          <Button className="bg-accent hover:bg-accent-dark" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add staff
          </Button>
        )}
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>New staff user</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={create} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                <Input label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </div>
              <Input label="Work email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Input label="Temporary password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <div>
                <label className="label-modern">Role</label>
                <select
                  className="input-glass"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'auditor' })}
                >
                  <option value="auditor">Auditor (customer service)</option>
                  <option value="admin">Admin (engineer)</option>
                </select>
              </div>
              {createError && <p className="text-sm text-danger-light">{createError}</p>}
              <div className="flex gap-2">
                <Button type="submit" isLoading={isCreating} className="bg-accent hover:bg-accent-dark">Create staff</Button>
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-content-muted">Loading staff…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-content-subtle border-b border-white/5 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-content">{s.firstName} {s.lastName}</td>
                  <td className="px-6 py-4 text-content-muted">{s.email}</td>
                  <td className="px-6 py-4">
                    <Badge variant={s.role === 'admin' ? 'info' : 'default'}>{s.role === 'admin' ? 'Administrator' : 'Customer Service'}</Badge>
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
