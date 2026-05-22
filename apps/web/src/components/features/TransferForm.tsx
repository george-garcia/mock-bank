import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transfersApi, accountsApi } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ArrowLeftRight, AlertCircle, CheckCircle } from 'lucide-react';

export function TransferForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    description: '',
  });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const transferMutation = useMutation({
    mutationFn: transfersApi.create,
    onSuccess: (response) => {
      setResult(response.data.data);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setForm({ fromAccountId: '', toAccountId: '', amount: '', description: '' });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Transfer failed');
      setResult(null);
    },
  });

  const accounts = accountsData?.data?.data || [];

  const fromAccount = accounts.find((a: any) => a.id.toString() === form.fromAccountId);
  const availableBalance = fromAccount ? parseFloat(fromAccount.balance) : 0;
  const transferAmount = parseFloat(form.amount || '0');
  const hasInsufficientFunds = transferAmount > availableBalance;
  const sameAccount = form.fromAccountId && form.fromAccountId === form.toAccountId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fromAccountId || !form.toAccountId || !form.amount || hasInsufficientFunds || sameAccount) return;
    setError('');
    transferMutation.mutate({
      fromAccountId: parseInt(form.fromAccountId),
      toAccountId: parseInt(form.toAccountId),
      amount: form.amount,
      description: form.description || undefined,
    });
  };

  const filteredToAccounts = accounts.filter((a: any) => a.id.toString() !== form.fromAccountId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-bank-600" />
          Transfer Between Accounts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result && (
          <div className="mb-4 p-4 bg-success-50 border border-success-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-success-600" />
              <span className="font-medium text-success-800">Transfer completed!</span>
            </div>
            <p className="text-sm text-success-700">
              ${parseFloat(result.amount).toFixed(2)} transferred successfully
            </p>
            <div className="flex gap-2 mt-2">
              <Badge variant="success">From: {result.fromAccount?.label || `Account #${result.fromAccountId}`}</Badge>
              <Badge variant="info">To: {result.toAccount?.label || `Account #${result.toAccountId}`}</Badge>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-danger-50 border border-danger-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">From Account</label>
            <select
              className="input"
              value={form.fromAccountId}
              onChange={(e) => setForm({ ...form, fromAccountId: e.target.value, toAccountId: '' })}
              required
            >
              <option value="">Select source account</option>
              {accounts.map((account: any) => (
                <option key={account.id} value={account.id}>
                  {account.label || `${account.type} #${account.id}`} — ${parseFloat(account.balance).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">To Account</label>
            <select
              className="input"
              value={form.toAccountId}
              onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}
              required
              disabled={!form.fromAccountId}
            >
              <option value="">Select destination account</option>
              {filteredToAccounts.map((account: any) => (
                <option key={account.id} value={account.id}>
                  {account.label || `${account.type} #${account.id}`} — ${parseFloat(account.balance).toFixed(2)}
                </option>
              ))}
            </select>
            {sameAccount && (
              <p className="text-xs text-danger-600 mt-1">Cannot transfer to the same account</p>
            )}
          </div>

          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="100.00"
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
            className="w-full"
            isLoading={transferMutation.isPending}
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
