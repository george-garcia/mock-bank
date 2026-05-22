import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { withdrawalsApi, accountsApi } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ArrowUpRight, AlertCircle, Clock } from 'lucide-react';

export function WithdrawalForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    accountId: '',
    amount: '',
    description: '',
  });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const withdrawalMutation = useMutation({
    mutationFn: withdrawalsApi.create,
    onSuccess: (response) => {
      setResult(response.data.data);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setForm({ accountId: '', amount: '', description: '' });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Withdrawal failed');
      setResult(null);
    },
  });

  const accounts = accountsData?.data?.data || [];

  const selectedAccount = accounts.find((a: any) => a.id.toString() === form.accountId);
  const availableBalance = selectedAccount ? parseFloat(selectedAccount.balance) : 0;
  const withdrawAmount = parseFloat(form.amount || '0');
  const hasInsufficientFunds = withdrawAmount > availableBalance;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountId || !form.amount || hasInsufficientFunds) return;
    setError('');
    withdrawalMutation.mutate({
      accountId: parseInt(form.accountId),
      amount: form.amount,
      description: form.description || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpRight className="w-5 h-5 text-danger-600" />
          Withdraw Funds
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result && (
          <div className="mb-4 p-4 bg-success-50 border border-success-200 rounded-lg">
            <p className="font-medium text-success-800">Withdrawal processed</p>
            <p className="text-sm text-success-700">{result.message}</p>
            <Badge variant="success" className="mt-2">
              {result.status}
            </Badge>
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
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              required
            >
              <option value="">Select account</option>
              {accounts.map((account: any) => (
                <option key={account.id} value={account.id}>
                  {account.label || `${account.type} #${account.id}`} — ${parseFloat(account.balance).toFixed(2)}
                </option>
              ))}
            </select>
            {selectedAccount && (
              <p className="text-xs text-gray-500 mt-1">
                Available balance: <span className="font-medium">${availableBalance.toFixed(2)}</span>
              </p>
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
            placeholder="e.g. ATM withdrawal"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <Button
            type="submit"
            className="w-full"
            variant="danger"
            isLoading={withdrawalMutation.isPending}
            disabled={hasInsufficientFunds}
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Withdraw Funds
          </Button>

          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Withdrawals typically arrive in 1-3 business days
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
