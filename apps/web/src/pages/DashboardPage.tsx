import { useDashboard } from '../hooks/useDashboard';
import { DashboardView } from '../views/DashboardView';

export function DashboardPage() {
  const dashboardData = useDashboard();
  return <DashboardView {...dashboardData} />;
}
