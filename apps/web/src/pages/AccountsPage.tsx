import { useAccounts } from '../hooks/useAccounts';
import { AccountsView } from '../views/AccountsView';

export function AccountsPage() {
  const accountsData = useAccounts();
  return <AccountsView {...accountsData} />;
}
