import { useAuthStore } from '../stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { TwoFactorSettings } from '../components/features/TwoFactorSettings';
import { User, Mail } from 'lucide-react';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-display font-bold text-content tracking-tight">Settings</h2>
        <p className="text-content-muted mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-primary-light" />
              </div>
              <div>
                <p className="font-display font-semibold text-xl text-content">
                  {user?.firstName} {user?.lastName}
                </p>
                <div className="flex items-center gap-2 text-sm text-content-muted mt-2">
                  <Mail className="w-4 h-4 text-primary-light/50" />
                  {user?.email}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TwoFactorSettings />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
