import { useMemo, useState } from 'react';
import { useAudit } from '../hooks/useAudit';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatDateTime } from '../lib/format';
import { ScrollText, Search } from 'lucide-react';

const actorVariant = (t: string) => (t === 'staff' ? 'info' : t === 'customer' ? 'success' : 'default');

// Group actions into categories (by prefix) so the trail is scannable and colour-coded.
type Category = 'security' | 'money' | 'card' | 'connect' | 'other';
const CATEGORY_META: Record<Category, { label: string; dot: string }> = {
  security: { label: 'Security', dot: 'bg-sky-400' },
  money: { label: 'Money', dot: 'bg-emerald-400' },
  card: { label: 'Card', dot: 'bg-violet-400' },
  connect: { label: 'Connect / ACH', dot: 'bg-amber-400' },
  other: { label: 'Other', dot: 'bg-white/40' },
};
function categorize(action: string): Category {
  if (/^(auth|staff)\./.test(action)) return 'security';
  if (/^(money|deposit|withdrawal|transfer)/.test(action)) return 'money';
  if (/^(card|network)\./.test(action)) return 'card';
  if (/^(connect|ach)\./.test(action)) return 'connect';
  return 'other';
}
const money = (minor: number | null) => (minor == null ? null : `$${(minor / 100).toFixed(2)}`);

const CATEGORIES: (Category | 'all')[] = ['all', 'security', 'money', 'card', 'connect', 'other'];

export function AuditPage() {
  const { logs, isLoading } = useAudit();
  const [q, setQ] = useState('');
  const [actor, setActor] = useState<'all' | 'customer' | 'staff' | 'system'>('all');
  const [cat, setCat] = useState<(Category | 'all')>('all');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return logs.filter((l: any) => {
      if (actor !== 'all' && l.actorType !== actor) return false;
      if (cat !== 'all' && categorize(l.action) !== cat) return false;
      if (needle && !`${l.action} ${l.targetType ?? ''} ${l.targetId ?? ''}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [logs, q, actor, cat]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <ScrollText className="w-6 h-6 text-accent-light" />
        <h2 className="text-2xl font-display font-bold text-content">Audit Log</h2>
        <Badge variant="default">{filtered.length}{filtered.length !== logs.length ? ` of ${logs.length}` : ''}</Badge>
      </div>

      {/* Filters */}
      <Card className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-content-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search action or target…"
            className="input-glass pl-9"
          />
        </div>
        <select value={actor} onChange={(e) => setActor(e.target.value as any)} className="input-glass w-auto">
          <option value="all">All actors</option>
          <option value="customer">Customer</option>
          <option value="staff">Staff</option>
          <option value="system">System</option>
        </select>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${cat === c ? 'bg-accent/20 text-accent-light border border-accent/40' : 'text-content-muted border border-white/10 hover:border-white/20'}`}
            >
              {c === 'all' ? 'All' : CATEGORY_META[c].label}
            </button>
          ))}
        </div>
      </Card>

      {/* Timeline */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-content-muted">Loading audit trail…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-content-muted">No matching audit entries.</div>
        ) : (
          <ul className="divide-y divide-white/5">
            {filtered.map((l: any) => {
              const c = categorize(l.action);
              const amt = money(l.amountMinor);
              return (
                <li key={l.id} className="flex items-start gap-4 px-6 py-4 hover:bg-white/5 transition-colors">
                  <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${CATEGORY_META[c].dot}`} title={CATEGORY_META[c].label} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-content">{l.action}</span>
                      <Badge variant={actorVariant(l.actorType)}>{l.actorType}{l.actorUserId != null ? ` #${l.actorUserId}` : ''}</Badge>
                      {l.targetType && <span className="text-xs text-content-subtle">{l.targetType} #{l.targetId}</span>}
                    </div>
                    <div className="text-xs text-content-subtle mt-1">
                      {formatDateTime(l.createdAt)}{l.ip ? ` · ${l.ip}` : ''}
                    </div>
                  </div>
                  {amt && <span className="font-mono text-sm text-content-muted whitespace-nowrap">{amt}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
