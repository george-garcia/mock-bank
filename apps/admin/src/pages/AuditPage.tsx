import { useAudit } from '../hooks/useAudit';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatDateTime } from '../lib/format';
import { ScrollText } from 'lucide-react';

const actorVariant = (t: string) => (t === 'staff' ? 'info' : t === 'customer' ? 'success' : 'default');

export function AuditPage() {
  const { logs, isLoading } = useAudit();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <ScrollText className="w-6 h-6 text-accent-light" />
        <h2 className="text-2xl font-display font-bold text-content">Audit Log</h2>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-content-muted">Loading audit trail…</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-content-muted">No audit entries.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-content-subtle border-b border-white/5 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">When</th>
                <th className="px-6 py-4 font-semibold">Actor</th>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold">Target</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-3 text-content-muted whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                  <td className="px-6 py-3">
                    <Badge variant={actorVariant(l.actorType)}>{l.actorType}</Badge>
                    {l.actorUserId != null && <span className="ml-2 text-content-subtle">#{l.actorUserId}</span>}
                  </td>
                  <td className="px-6 py-3 font-mono text-content">{l.action}</td>
                  <td className="px-6 py-3 text-content-muted">{l.targetType ? `${l.targetType} #${l.targetId}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
