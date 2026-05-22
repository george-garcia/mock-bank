import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi, accountsApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ArrowLeftRight, Wallet } from 'lucide-react';

export function TransactionsPage() {
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['transactions', selectedAccount],
    queryFn: () => transactionsApi.list(parseInt(selectedAccount)),
    enabled: !!selectedAccount,
  });

  const accounts = accountsData?.data?.data || [];
  const transactions = transactionsData?.data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
        <p className="text-gray-500">View your transaction history</p>
      </div>

      <div>
        <label className="label">Select Account</label>
        <select
          className="input max-w-md"
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
        >
          <option value="">Choose an account</option>
          {accounts.map((account: any) => (
            <option key={account.id} value={account.id}>
              {account.label || `${account.type} #${account.id}`} — ${parseFloat(account.balance).toFixed(2)}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedAccount ? (
            <div className="text-center py-8">
              <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select an account to view transactions</p>
            </div>
          ) : isLoading ? (
            <p className="text-gray-500">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tx.type === 'deposit' || tx.type === 'transfer'
                        ? 'bg-success-100'
                        : 'bg-danger-100'
                    }`}>
                      <ArrowLeftRight className={`w-5 h-5 ${
                        tx.type === 'deposit' || tx.type === 'transfer'
                          ? 'text-success-600'
                          : 'text-danger-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      tx.type === 'deposit' || tx.type === 'transfer'
                        ? 'text-success-600'
                        : 'text-danger-600'
                    }`}>
                      {tx.type === 'deposit' || tx.type === 'transfer' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                    </p>
                    <Badge variant={tx.status === 'completed' ? 'success' : 'warning'}>
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
