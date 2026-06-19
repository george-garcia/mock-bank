import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  ArrowLeftRight,
  FileText,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/cards', icon: CreditCard, label: 'Cards' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/statements', icon: FileText, label: 'Statements' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="w-64 bg-surface/40 backdrop-blur-xl border-r border-white/5 min-h-screen flex flex-col relative z-20">
      <div className="p-6">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] transition-all">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-content-muted">Mock Bank</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10 text-primary-light border border-primary/20 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]'
                  : 'text-content-muted hover:bg-white/5 hover:text-content border border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-primary-light drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : ''}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5 mb-4 mx-4">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-content-muted hover:bg-danger/10 hover:text-danger-light hover:border-danger/20 border border-transparent transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
