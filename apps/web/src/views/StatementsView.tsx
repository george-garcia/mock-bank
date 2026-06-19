import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { FileText } from 'lucide-react';

interface StatementsViewProps {
  accounts: any[];
  accountId: number | null;
  setAccountId: (id: number) => void;
  statements: any[];
  isLoading: boolean;
  selected: any;
  selectedId: number | null;
  setSelectedId: (id: number) => void;
  period: { periodStart: string; periodEnd: string };
  setPeriod: (p: { periodStart: string; periodEnd: string }) => void;
  generate: () => void;
  isGenerating: boolean;
}

const money = (v: string) => `$${parseFloat(v).toFixed(2)}`;
const day = (d: string) => new Date(d).toLocaleDateString();

export function StatementsView({
  accounts, accountId, setAccountId, statements, isLoading, selected, selectedId, setSelectedId,
  period, setPeriod, generate, isGenerating,
}: StatementsViewProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-display font-bold text-content tracking-tight">Statements</h2>
        <p className="text-content-muted mt-1">Generate and review account statements</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Generate a statement</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="label-modern">Account</label>
              <select
                className="input-glass appearance-none cursor-pointer"
                value={accountId ?? ''}
                onChange={(e) => setAccountId(Number(e.target.value))}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-surface text-content">
                    {a.type} #{a.id}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="From"
              type="date"
              value={period.periodStart}
              onChange={(e) => setPeriod({ ...period, periodStart: e.target.value })}
            />
            <Input
              label="To"
              type="date"
              value={period.periodEnd}
              onChange={(e) => setPeriod({ ...period, periodEnd: e.target.value })}
            />
            <Button onClick={generate} isLoading={isGenerating} disabled={accountId === null}>
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-content-muted text-sm">Loading…</p>
            ) : statements.length === 0 ? (
              <p className="text-content-muted text-sm">No statements yet — generate one above.</p>
            ) : (
              statements.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    selectedId === s.id ? 'border-primary/40 bg-primary/10' : 'border-white/5 hover:bg-white/5'
                  }`}
                >
                  <p className="text-sm font-medium text-content">{day(s.periodStart)} – {day(s.periodEnd)}</p>
                  <p className="text-xs text-content-muted mt-1">Closing {money(s.closingBalance)} · {s.transactionCount} txns</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Statement</CardTitle></CardHeader>
          <CardContent>
            {!selected ? (
              <div className="py-12 text-center text-content-muted">
                <FileText className="w-10 h-10 mx-auto mb-3 text-content-subtle" />
                Select or generate a statement to view it.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Figure label="Opening" value={money(selected.openingBalance)} />
                  <Figure label="Credits" value={money(selected.totalCredits)} tone="success" />
                  <Figure label="Debits" value={money(selected.totalDebits)} tone="danger" />
                  <Figure label="Closing" value={money(selected.closingBalance)} />
                </div>

                <div className="border-t border-white/5 pt-4">
                  {selected.lines.length === 0 ? (
                    <p className="text-content-muted text-sm">No transactions in this period.</p>
                  ) : (
                    <div className="space-y-2">
                      {selected.lines.map((l: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0">
                          <div>
                            <span className="text-content">{l.description || l.type}</span>
                            <span className="text-content-subtle ml-2 text-xs">{day(l.date)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={l.status === 'posted' ? 'success' : 'warning'}>{l.status}</Badge>
                            <span className={`font-mono tabular-nums ${parseFloat(l.amount) < 0 ? 'text-danger-light' : 'text-success-light'}`}>
                              {money(l.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' }) {
  const color = tone === 'success' ? 'text-success-light' : tone === 'danger' ? 'text-danger-light' : 'text-content';
  return (
    <div className="bg-surface-highlight/40 border border-white/5 rounded-xl p-4">
      <p className="text-xs font-semibold text-content-muted uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-display font-bold mt-1 tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
