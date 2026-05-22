import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { depositsApi, accountsApi } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ArrowDownLeft, Zap, Clock } from 'lucide-react';

export function DepositForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    accountId: '',
    amount: '',
    description: '',
    instant: false,
  });
  const [result, setResult] = useState<any>(null);

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const depositMutation = useMutation({
    mutationFn: depositsApi.simulate,
    onSuccess: (response) => {
      setResult(response.data.data);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setForm({ accountId: '', amount: '', description: '', instant: false });
    },
  });

  const accounts = accountsData?.data?.data || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountId || !form.amount) return;
    depositMutation.mutate({
      accountId: parseInt(form.accountId),
      amount: form.amount,
      description: form.description || undefined,
      instant: form.instant,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowDownLeft className="w-5 h-5 text-success-600" />
          Deposit Funds
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result && (
          <div className="mb-4 p-4 bg-success-50 border border-success-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-success-600" />
              <span className="font-medium text-success-800">Deposit successful!</span>
            </div>
            <p className="text-sm text-success-700">
              {result.message || `Deposited $${parseFloat(result.transaction?.amount || 0).toFixed(2)}`}
            </p>
            <Badge variant="success" className="mt-2">
              {result.transaction?.status || 'completed'}
            </Badge>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">To Account</label>
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
          </div>

          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="100.00"
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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="instant"
              checked={form.instant}
              onChange={(e) => setForm({ ...form, instant: e.target.checked })}
              className="w-4 h-4 text-bank-600 border-gray-300 rounded focus:ring-bank-500"
            />
            <label htmlFor="instant" className="text-sm text-gray-700 flex items-center gap-1">
              <Zap className="w-4 h-4 text-yellow-500" />
              Instant deposit (simulated)
            </label>
          </div>

          <Button
            type="submit"
            className="w-full"
            isLoading={depositMutation.isPending}
          >
            <ArrowDownLeft className="w-4 h-4 mr-2" />
            Deposit Funds
          </Button>

          {!form.instant && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Standard deposits are processed within 1-3 business days
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
