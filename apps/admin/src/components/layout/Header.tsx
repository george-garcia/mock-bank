import { useAuthStore } from '../../stores/auth';
import { UserCog } from 'lucide-react';
import { Badge } from '../ui/Badge';

export function Header() {
  const staff = useAuthStore((s) => s.staff);

  return (
    <header className="h-16 bg-surface/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-content">
        Back-office console
      </h1>
      <div className="flex items-center gap-3">
        <Badge variant={staff?.role === 'admin' ? 'info' : 'default'}>
          {staff?.role === 'admin' ? 'Administrator' : 'Customer Service'}
        </Badge>
        <div className="w-8 h-8 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center">
          <UserCog className="w-4 h-4 text-accent-light" />
        </div>
        <span className="text-sm font-medium text-content-muted">
          {staff?.firstName} {staff?.lastName}
        </span>
      </div>
    </header>
  );
}
