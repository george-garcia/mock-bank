import { useAuthStore } from '../../stores/auth';
import { User } from 'lucide-react';

export function Header() {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="h-16 bg-surface/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-content">
        Welcome back, <span className="text-primary-light">{user?.firstName || 'User'}</span>
      </h1>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-primary-light" />
        </div>
        <span className="text-sm font-medium text-content-muted">
          {user?.firstName} {user?.lastName}
        </span>
      </div>
    </header>
  );
}
