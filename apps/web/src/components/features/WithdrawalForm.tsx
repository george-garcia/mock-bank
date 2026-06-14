import { useWithdrawal } from '../../hooks/useWithdrawal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ArrowUpRight, AlertCircle, Clock } from 'lucide-react';

export function WithdrawalForm() {
  const {
    accounts,
    form,
    setForm,
    result,
    error,
    selectedAccount,
    availableBalance,
    hasInsufficientFunds,
    handleSubmit,
    isSubmitting,
  } = useWithdrawal();

  return (
    <Card className="border-danger/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-8 h-8 bg-danger/10 rounded-lg flex items-center justify-center border border-danger/20">
            <ArrowUpRight className="w-4 h-4 text-danger-light" />
          </div>
          Withdraw Funds
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result && (
          <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-xl">
            <p className="font-semibold text-success-light">Withdrawal processed</p>
            <p className="text-sm text-content-muted mt-1">{result.message}</p>
            <div className="mt-3">
              <Badge variant="success">
                {result.status}
              </Badge>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger-light flex-shrink-0 mt-0.5" />
            <p className="text-sm text-danger-light">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label-modern">From Account</label>
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
            {selectedAccount && (
              <p className="text-xs text-content-muted mt-2">
                Available balance: <span className="font-semibold text-content">${availableBalance.toFixed(2)}</span>
              </p>
            )}
          </div>

          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="e.g. 100.00"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            error={hasInsufficientFunds ? `Amount exceeds available balance ($${availableBalance.toFixed(2)})` : undefined}
            required
          />

          <Input
            label="Description (optional)"
            placeholder="e.g. ATM withdrawal"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <Button
            type="submit"
            className="w-full bg-danger-dark hover:bg-danger hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] border-danger-light/30"
            isLoading={isSubmitting}
            disabled={hasInsufficientFunds}
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Withdraw Funds
          </Button>

          <p className="text-xs text-content-subtle flex items-center gap-1.5 justify-center mt-4">
            <Clock className="w-3.5 h-3.5" />
            Withdrawals typically arrive in 1-3 business days
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
