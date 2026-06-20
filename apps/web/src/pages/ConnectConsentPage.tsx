import { useEffect, useMemo, useState } from 'react';
import { connectApi } from '../lib/api';

/**
 * The bank's hosted "Connect" consent page (the Plaid-Link equivalent). It is opened in a popup
 * by a partner's site via the @mockbank/connect SDK with a `?link_token=...`. The customer logs
 * in to the bank, picks an account, and approves. On approval we post the resulting public token
 * back to the opener (the partner) and close.
 */

interface SessionInfo {
  partner_name: string;
  scopes: string[];
  status: string;
}
interface AccountRow {
  id: number;
  type: string;
  balance: string;
  availableBalance: string;
}

type Phase = 'loading' | 'login' | 'twofactor' | 'select' | 'done' | 'error';

const SCOPE_LABELS: Record<string, string> = {
  balances: 'View your account balances',
  transfers: 'Move money to and from this account',
};

export function ConnectConsentPage() {
  const linkToken = useMemo(() => new URLSearchParams(window.location.search).get('link_token') ?? '', []);
  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [code, setCode] = useState('');

  const partnerName = session?.partner_name ?? 'a third-party app';

  useEffect(() => {
    if (!linkToken) {
      setError('Missing link token.');
      setPhase('error');
      return;
    }
    (async () => {
      try {
        const info = await connectApi.session(linkToken);
        setSession(info);
        if (info.status !== 'created') {
          setError('This connection link has already been used or has expired.');
          setPhase('error');
          return;
        }
        // Already logged in to the bank? Jump straight to account selection.
        try {
          const accts = await connectApi.accounts();
          setAccounts(accts);
          setPhase('select');
        } catch {
          setPhase('login');
        }
      } catch {
        setError('This connection link is invalid or has expired.');
        setPhase('error');
      }
    })();
  }, [linkToken]);

  async function loadAccountsAndSelect() {
    const accts = await connectApi.accounts();
    setAccounts(accts);
    setSelectedId(accts[0]?.id ?? null);
    setPhase('select');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result: any = await connectApi.login({ email, password });
      if (result?.requiresTwoFactor) {
        setChallengeToken(result.challengeToken);
        setPhase('twofactor');
      } else {
        await loadAccountsAndSelect();
      }
    } catch {
      setError('Invalid email or password.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await connectApi.verifyLogin({ challengeToken, code });
      await loadAccountsAndSelect();
    } catch {
      setError('Invalid or expired code.');
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    if (!selectedId) return;
    setBusy(true);
    setError('');
    try {
      const { public_token } = await connectApi.authorize(linkToken, selectedId);
      if (window.opener) {
        window.opener.postMessage({ type: 'mockbank_connect_success', public_token }, '*');
      }
      setPhase('done');
      setTimeout(() => window.close(), 1200);
    } catch {
      setError('Could not authorize this account. Please try again.');
      setBusy(false);
    }
  }

  function handleCancel() {
    if (window.opener) window.opener.postMessage({ type: 'mockbank_connect_exit' }, '*');
    window.close();
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="card-glass w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary-light font-display font-bold">
            M
          </div>
          <div>
            <p className="font-display font-bold text-content leading-tight">Mock Bank</p>
            <p className="text-xs text-content-muted">Secure account connection</p>
          </div>
        </div>

        {phase === 'loading' && <p className="text-content-muted py-8 text-center">Loading…</p>}

        {phase === 'error' && (
          <div className="py-4">
            <p className="text-danger mb-6">{error}</p>
            <button className="btn-primary w-full" onClick={handleCancel}>Close</button>
          </div>
        )}

        {(phase === 'login' || phase === 'twofactor') && (
          <>
            <h1 className="text-xl font-display font-semibold text-content mb-1">
              Connect to {partnerName}
            </h1>
            <p className="text-sm text-content-muted mb-6">Sign in to your Mock Bank account to continue.</p>

            {phase === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="label-modern">Email</label>
                  <input className="input-glass" type="email" value={email} autoFocus
                    onChange={(e) => setEmail(e.target.value)} placeholder="alice@example.com" required />
                </div>
                <div>
                  <label className="label-modern">Password</label>
                  <input className="input-glass" type="password" value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                {error && <p className="text-danger text-sm">{error}</p>}
                <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="label-modern">Verification code</label>
                  <input className="input-glass tracking-[0.4em] text-center" value={code}
                    onChange={(e) => setCode(e.target.value)} placeholder="000000" inputMode="numeric" autoFocus required />
                </div>
                {error && <p className="text-danger text-sm">{error}</p>}
                <button className="btn-primary w-full" disabled={busy}>{busy ? 'Verifying…' : 'Verify'}</button>
              </form>
            )}
            <button onClick={handleCancel} className="text-xs text-content-muted mt-4 hover:text-content w-full text-center">
              Cancel
            </button>
          </>
        )}

        {phase === 'select' && (
          <>
            <h1 className="text-xl font-display font-semibold text-content mb-1">
              Allow {partnerName} to connect
            </h1>
            <p className="text-sm text-content-muted mb-4">Choose an account and review what you’re sharing.</p>

            <div className="space-y-2 mb-5">
              {accounts.map((a) => (
                <button key={a.id} type="button" onClick={() => setSelectedId(a.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedId === a.id ? 'border-primary/60 bg-primary/10' : 'border-white/10 hover:border-white/20'
                  }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-content font-medium capitalize">{a.type} ••••{String(a.id).padStart(4, '0')}</p>
                      <p className="text-xs text-content-muted">Available ${parseFloat(a.availableBalance).toFixed(2)}</p>
                    </div>
                    <span className={`w-4 h-4 rounded-full border ${selectedId === a.id ? 'bg-primary border-primary' : 'border-white/30'}`} />
                  </div>
                </button>
              ))}
              {accounts.length === 0 && <p className="text-content-muted text-sm">No accounts found.</p>}
            </div>

            <div className="rounded-xl bg-black/30 border border-white/10 p-4 mb-5">
              <p className="label-modern mb-2">{partnerName} will be able to</p>
              <ul className="space-y-1">
                {(session?.scopes ?? []).map((s) => (
                  <li key={s} className="text-sm text-content-muted flex items-center gap-2">
                    <span className="text-primary-light">✓</span> {SCOPE_LABELS[s] ?? s}
                  </li>
                ))}
              </ul>
            </div>

            {error && <p className="text-danger text-sm mb-3">{error}</p>}
            <div className="flex gap-3">
              <button className="btn-primary flex-1" onClick={handleApprove} disabled={busy || !selectedId}>
                {busy ? 'Connecting…' : 'Allow'}
              </button>
              <button className="px-4 py-3 rounded-xl border border-white/10 text-content-muted hover:text-content" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </>
        )}

        {phase === 'done' && (
          <div className="py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-success/20 border border-success/30 flex items-center justify-center mx-auto mb-4 text-success text-2xl">✓</div>
            <p className="text-content font-medium">Account connected</p>
            <p className="text-content-muted text-sm mt-1">You can return to {partnerName}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
