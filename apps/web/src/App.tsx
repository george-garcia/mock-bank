import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { ConnectConsentPage } from './pages/ConnectConsentPage';
import { DashboardPage } from './pages/DashboardPage';
import { AccountsPage } from './pages/AccountsPage';
import { CardsPage } from './pages/CardsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { StatementsPage } from './pages/StatementsPage';
import { SettingsPage } from './pages/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Public hosted consent page for the Connect SDK (opened in a popup by partner sites). */}
      <Route path="/connect" element={<ConnectConsentPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="cards" element={<CardsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="statements" element={<StatementsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
