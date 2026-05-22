import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Wallet, Plus } from 'lucide-react';

export function AccountsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newAccount, setNewAccount] = useState({ type: 'checking' as 'checking' | 'savings', label: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setShowCreate(false);
      setNewAccount({ type: 'checking', label: '' });
    },
  });

  const accounts = data?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Accounts</h2>
          <p className="text-gray-500">Manage your bank accounts</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Account
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(newAccount);
              }}
              className="space-y-4"
            >
              <div>
                <label className="label">Account Type</label>
                <select
                  className="input"
                  value={newAccount.type}
                  onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value as 'checking' | 'savings' })}
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
              <div>
                <label className="label">Label (optional)</label>
                <input
                  className="input"
                  value={newAccount.label}
                  onChange={(e) => setNewAccount({ ...newAccount, label: e.target.value })}
                  placeholder="e.g. Main Checking"
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" isLoading={createMutation.isPending}>
                  Create Account
                </Button>
                <Button variant="secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <p className="text-gray-500">Loading accounts...</p>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No accounts yet. Create your first account to get started.</p>
            </CardContent>
          </Card>
        ) : (
          accounts.map((account: any) => (
            <Card key={account.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-bank-100 rounded-lg flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-bank-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {account.type} Account
                      </p>
                      <p className="text-sm text-gray-500">
                        {account.label || `Account #${account.id}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant={account.status === 'active' ? 'success' : 'warning'}>
                    {account.status}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Balance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${parseFloat(account.balance).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
