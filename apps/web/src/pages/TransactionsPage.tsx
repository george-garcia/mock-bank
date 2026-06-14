import { useTransactions } from '../hooks/useTransactions';
import { TransactionsView } from '../views/TransactionsView';

export function TransactionsPage() {
  const transactionsData = useTransactions();
  return <TransactionsView {...transactionsData} />;
}
