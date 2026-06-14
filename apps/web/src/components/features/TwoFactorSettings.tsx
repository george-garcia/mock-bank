import { useTwoFactorSettings } from '../../hooks/useTwoFactorSettings';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Shield, Smartphone, Mail, Check, Loader2 } from 'lucide-react';

export function TwoFactorSettings() {
  const {
    method,
    loading,
    view,
    busy,
    error,
    notice,
    totp,
    code,
    setCode,
    reset,
    startTotp,
    startEmail,
    startDisable,
    confirmTotp,
    confirmEmail,
    confirmDisable,
  } = useTwoFactorSettings();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-content-muted text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  const errorBox = error && (
    <div className="p-3 bg-danger/10 border border-danger/20 text-danger-light text-sm rounded-xl">
      {error}
    </div>
  );
  const noticeBox = notice && (
    <div className="p-3 bg-primary/10 border border-primary/20 text-primary-light text-sm rounded-xl">
      {notice}
    </div>
  );

  // Enabled state (and not mid-disable)
  if (method !== 'none' && view !== 'disable') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-success/10 border border-success/20 rounded-xl flex items-center justify-center">
            <Check className="w-6 h-6 text-success-light" />
          </div>
          <div>
            <p className="font-semibold text-content text-lg">Two-Factor Authentication</p>
            <p className="text-sm text-success-light mt-1">
              Enabled · {method === 'totp' ? 'Authenticator app' : 'Email code'}
            </p>
          </div>
        </div>
        {errorBox}
        <Button variant="danger" size="sm" onClick={startDisable} isLoading={busy}>
          Disable two-factor
        </Button>
      </div>
    );
  }

  // Disable confirmation
  if (view === 'disable') {
    return (
      <div className="space-y-4">
        <p className="font-semibold text-content text-lg">Disable two-factor</p>
        <p className="text-sm text-content-muted">
          {method === 'totp'
            ? 'Enter a current code from your authenticator app to confirm.'
            : 'Enter the verification code we just emailed you to confirm.'}
        </p>
        {noticeBox}
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" inputMode="numeric" />
        {errorBox}
        <div className="flex gap-3">
          <Button variant="danger" onClick={confirmDisable} isLoading={busy}>Confirm disable</Button>
          <Button variant="ghost" onClick={reset}>Cancel</Button>
        </div>
      </div>
    );
  }

  // TOTP setup
  if (view === 'totp-setup' && totp) {
    return (
      <div className="space-y-4">
        <p className="font-semibold text-content text-lg">Set up authenticator app</p>
        <p className="text-sm text-content-muted">
          Scan this QR code with Google Authenticator, 1Password, Authy, etc. — then enter the
          6-digit code it shows.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <img src={totp.qrCodeDataUrl} alt="Authenticator QR code" className="w-40 h-40 rounded-xl bg-white p-2" />
          <div className="text-sm text-content-muted">
            <p className="mb-1">Can't scan? Enter this key manually:</p>
            <code className="block break-all text-content bg-surface-highlight rounded-lg px-3 py-2 text-xs">
              {totp.secret}
            </code>
          </div>
        </div>
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" inputMode="numeric" autoFocus />
        {errorBox}
        <div className="flex gap-3">
          <Button onClick={confirmTotp} isLoading={busy}>Verify and enable</Button>
          <Button variant="ghost" onClick={reset}>Cancel</Button>
        </div>
      </div>
    );
  }

  // Email setup
  if (view === 'email-setup') {
    return (
      <div className="space-y-4">
        <p className="font-semibold text-content text-lg">Set up email codes</p>
        {noticeBox}
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" inputMode="numeric" autoFocus />
        {errorBox}
        <div className="flex gap-3">
          <Button onClick={confirmEmail} isLoading={busy}>Verify and enable</Button>
          <Button variant="ghost" onClick={reset}>Cancel</Button>
        </div>
      </div>
    );
  }

  // Idle / disabled — choose a method
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-warning/10 border border-warning/20 rounded-xl flex items-center justify-center">
          <Shield className="w-6 h-6 text-warning-light" />
        </div>
        <div>
          <p className="font-semibold text-content text-lg">Two-Factor Authentication</p>
          <p className="text-sm text-warning-light mt-1">Not enabled — add a second step at sign in</p>
        </div>
      </div>
      {errorBox}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button variant="secondary" onClick={startTotp} isLoading={busy} className="justify-start">
          <Smartphone className="w-4 h-4 mr-2" /> Authenticator app
        </Button>
        <Button variant="secondary" onClick={startEmail} isLoading={busy} className="justify-start">
          <Mail className="w-4 h-4 mr-2" /> Email codes
        </Button>
      </div>
    </div>
  );
}
