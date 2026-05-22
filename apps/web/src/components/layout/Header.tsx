import { useAuthStore } from '../../stores/auth';
import { User } from 'lucide-react';

export function Header() {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
      <h1 className="text-lg font-semibold text-gray-900">
        Welcome back, {user?.firstName || 'User'}
      </h1>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-bank-100 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-bank-600" />
        </div>
        <span className="text-sm font-medium text-gray-700">
          {user?.firstName} {user?.lastName}
        </span>
      </div>
    </header>
  );
}
