import { useTransfer } from '../../hooks/useTransfer';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ArrowLeftRight, AlertCircle, CheckCircle } from 'lucide-react';

export function TransferForm() {
  const {
    accounts,
    filteredToAccounts,
    form,
    setForm,
    result,
    error,
    availableBalance,
    hasInsufficientFunds,
    sameAccount,
    handleSubmit,
    isSubmitting,
  } = useTransfer();

  return (
    <Card className="border-primary/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
            <ArrowLeftRight className="w-4 h-4 text-primary-light" />
          </div>
          Transfer Between Accounts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result && (
          <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-success-light" />
              <span className="font-semibold text-success-light">Transfer completed!</span>
            </div>
            <p className="text-sm text-content-muted">
              {result.message}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="success">From Account #{result.fromTransaction?.accountId}</Badge>
              <Badge variant="info">To Account #{result.toTransaction?.accountId}</Badge>
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
                value={form.fromAccountId}
                onChange={(e) => setForm({ ...form, fromAccountId: e.target.value, toAccountId: '' })}
                required
              >
                <option value="" className="bg-surface text-content">Select source account</option>
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

          <div>
            <label className="label-modern">To Account</label>
            <div className="relative">
              <select
                className="input-glass appearance-none cursor-pointer disabled:opacity-50"
                value={form.toAccountId}
                onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}
                required
                disabled={!form.fromAccountId}
              >
                <option value="" className="bg-surface text-content">Select destination account</option>
                {filteredToAccounts.map((account: any) => (
                  <option key={account.id} value={account.id} className="bg-surface text-content">
                    {account.label || `${account.type} #${account.id}`} — ${parseFloat(account.balance).toFixed(2)}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-content-muted">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            {sameAccount && (
              <p className="text-xs text-danger-light mt-2">Cannot transfer to the same account</p>
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
            placeholder="e.g. Monthly savings transfer"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary-dark hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] border-primary-light/30"
            isLoading={isSubmitting}
            disabled={hasInsufficientFunds || !!sameAccount}
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Transfer Funds
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
