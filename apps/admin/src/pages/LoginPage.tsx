import { useLogin } from '../hooks/useLogin';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Shield } from 'lucide-react';

export function LoginPage() {
  const { isLoading, error, form, setForm, handleSubmit, demoLogin } = useLogin();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-accent to-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold text-content tracking-tight">Admin Console</h1>
          <p className="text-content-muted mt-2">Mock Bank back-office — staff sign in</p>
        </div>

        <div className="card-glass border-accent/20 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Work email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="admin@bank.internal"
              autoFocus
              required
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />

            {error && (
              <div className="p-4 bg-danger/10 border border-danger/20 text-danger-light text-sm rounded-xl">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent-dark shadow-[0_0_15px_rgba(139,92,246,0.4)]"
              isLoading={isLoading}
            >
              Sign in to console
            </Button>
          </form>

          <button
            type="button"
            onClick={demoLogin}
            disabled={isLoading}
            className="mt-3 w-full rounded-xl border border-accent/30 bg-accent/5 py-2.5 text-sm font-medium text-accent-light transition-colors hover:bg-accent/10 disabled:opacity-60"
          >
            Explore a demo console →
          </button>

          <p className="mt-6 text-center text-xs text-content-subtle">
            Staff accounts are separate from customer logins.
          </p>
        </div>
      </div>
    </div>
  );
}
