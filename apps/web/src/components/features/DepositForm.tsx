import { useDeposit } from '../../hooks/useDeposit';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ArrowDownLeft, Zap, Clock } from 'lucide-react';

export function DepositForm() {
  const { accounts, form, setForm, result, handleSubmit, isSubmitting } = useDeposit();

  return (
    <Card className="border-success/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center border border-success/20">
            <ArrowDownLeft className="w-4 h-4 text-success-light" />
          </div>
          Deposit Funds
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result && (
          <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-success-light" />
              <span className="font-semibold text-success-light">
                {result.status === 'pending' ? 'Deposit initiated' : 'Deposit successful!'}
              </span>
            </div>
            <p className="text-sm text-content-muted">
              {result.message || `Deposited $${parseFloat(result.transaction?.amount || 0).toFixed(2)}`}
            </p>
            <div className="mt-3">
              <Badge variant={result.status === 'pending' ? 'warning' : 'success'}>
                {result.status || 'completed'}
              </Badge>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label-modern">To Account</label>
            <div className="relative">
              <select
                className="input-glass appearance-none cursor-pointer"
                value={form.accountId}
                onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                required
              >
                <option value="" className="bg-surface text-content">Select account</option>
                {accounts.map((account: any) => (
                  <option key={account.id} value={account.id} className="bg-surface text-content">
                    {account.label || `${account.type} #${account.id}`} — ${parseFloat(account.balance).toFixed(2)}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-content-muted">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="e.g. 100.00"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />

          <Input
            label="Description (optional)"
            placeholder="e.g. Paycheck deposit"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div className="flex items-center gap-3 p-3 bg-surface-highlight/50 rounded-xl border border-white/5">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                id="instant"
                checked={form.instant}
                onChange={(e) => setForm({ ...form, instant: e.target.checked })}
                className="w-5 h-5 bg-surface border-white/10 rounded focus:ring-success-light/50 text-success-light appearance-none checked:bg-success-light checked:border-success-light transition-colors cursor-pointer"
              />
              {form.instant && (
                <svg className="absolute w-3.5 h-3.5 top-[3px] left-[3px] pointer-events-none text-white" viewBox="0 0 14 14" fill="none">
                  <path d="M3 8L6 11L11 3.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" />
                </svg>
              )}
            </div>
            <label htmlFor="instant" className="text-sm font-medium text-content cursor-pointer flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning-light" />
              Instant deposit <span className="text-content-muted font-normal">(simulated)</span>
            </label>
          </div>

          <Button
            type="submit"
            className="w-full bg-success-dark hover:bg-success hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] border-success-light/30"
            isLoading={isSubmitting}
          >
            <ArrowDownLeft className="w-4 h-4 mr-2" />
            Deposit Funds
          </Button>

          {!form.instant && (
            <p className="text-xs text-content-subtle flex items-center gap-1.5 justify-center mt-4">
              <Clock className="w-3.5 h-3.5" />
              Standard deposits are processed within 1-3 business days
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
