import { useQuery } from '@tanstack/react-query';
import { accountsApi, cardsApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { QuickActions } from '../components/features/QuickActions';
import { Wallet, CreditCard, ArrowUpRight } from 'lucide-react';

export function DashboardPage() {
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const { data: cardsData } = useQuery({
    queryKey: ['cards'],
    queryFn: () => cardsApi.list(),
  });

  const accounts = accountsData?.data?.data || [];
  const cards = cardsData?.data?.data || [];

  const totalBalance = accounts.reduce((sum: number, acc: any) => sum + parseFloat(acc.balance), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500">Overview of your accounts and cards</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${totalBalance.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-bank-100 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-bank-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Accounts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {accounts.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-success-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Cards</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {cards.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-bank-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-bank-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-gray-500 text-sm">No accounts yet. Create one to get started.</p>
          ) : (
            <div className="space-y-3">
              {accounts.map((account: any) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-bank-100 rounded-lg flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-bank-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {account.type} Account
                      </p>
                      <p className="text-sm text-gray-500">
                        {account.label || `Account ending in ${account.id}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ${parseFloat(account.balance).toFixed(2)}
                    </p>
                    <Badge variant={account.status === 'active' ? 'success' : 'warning'}>
                      {account.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Cards */}
      {cards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cards.map((card: any) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-bank-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-bank-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        •••• {card.lastFour}
                      </p>
                      <p className="text-sm text-gray-500">
                        Expires {card.expiryMonth}/{card.expiryYear}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      card.status === 'active'
                        ? 'success'
                        : card.status === 'frozen'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {card.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
