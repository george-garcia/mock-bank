import { useLogin } from '../hooks/useLogin';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Wallet, ShieldCheck } from 'lucide-react';

export function LoginPage() {
  const {
    isLogin,
    setIsLogin,
    isLoading,
    error,
    form,
    setForm,
    challenge,
    code,
    setCode,
    handleSubmit,
    handleVerify,
    resetToCredentials,
    demoLogin,
  } = useLogin();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold text-content tracking-tight">Mock Bank</h1>
          <p className="text-content-muted mt-2">
            {challenge
              ? 'Two-factor verification'
              : isLogin
                ? 'Sign in to your account'
                : 'Create a new account'}
          </p>
        </div>

        <div className="card-glass border-primary/20 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          {challenge ? (
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="flex items-center gap-3 text-content-muted text-sm">
                <ShieldCheck className="w-5 h-5 text-primary-light shrink-0" />
                <p>
                  {challenge.method === 'email'
                    ? 'We emailed you a verification code. Enter it below to continue.'
                    : 'Enter the 6-digit code from your authenticator app.'}
                </p>
              </div>
              <Input
                label="Verification code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                required
              />

              {error && (
                <div className="p-4 bg-danger/10 border border-danger/20 text-danger-light text-sm rounded-xl">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full bg-primary hover:bg-primary-dark shadow-[0_0_15px_rgba(59,130,246,0.4)]" isLoading={isLoading}>
                Verify and sign in
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={resetToCredentials}
                  className="text-sm text-content-muted hover:text-primary-light font-medium transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      required
                    />
                    <Input
                      label="Last Name"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      required
                    />
                  </div>
                )}
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
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

                <Button type="submit" className="w-full bg-primary hover:bg-primary-dark shadow-[0_0_15px_rgba(59,130,246,0.4)]" isLoading={isLoading}>
                  {isLogin ? 'Sign in to Mock Bank' : 'Create secure account'}
                </Button>
              </form>

              {isLogin && (
                <button
                  type="button"
                  onClick={demoLogin}
                  disabled={isLoading}
                  className="mt-3 w-full rounded-xl border border-primary/30 bg-primary/5 py-2.5 text-sm font-medium text-primary-light transition-colors hover:bg-primary/10 disabled:opacity-60"
                >
                  Explore a demo account →
                </button>
              )}

              <div className="mt-8 text-center border-t border-white/5 pt-6">
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-content-muted hover:text-primary-light font-medium transition-colors"
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
