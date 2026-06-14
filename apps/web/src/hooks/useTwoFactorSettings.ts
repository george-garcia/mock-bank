import { useEffect, useState } from 'react';
import { twoFactorApi } from '../lib/api';

export type Method = 'none' | 'email' | 'totp';
export type View = 'idle' | 'totp-setup' | 'email-setup' | 'disable';

export function useTwoFactorSettings() {
  const [method, setMethod] = useState<Method>('none');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [totp, setTotp] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [code, setCode] = useState('');

  const loadStatus = async () => {
    try {
      const status = await twoFactorApi.status();
      setMethod(status.method as Method);
    } catch {
      // leave default
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const reset = () => {
    setView('idle');
    setCode('');
    setTotp(null);
    setError('');
    setNotice('');
  };

  const fail = (err: any, fallback: string) =>
    setError(err.response?.data?.message || fallback);

  // ---- start flows --------------------------------------------------------

  const startTotp = async () => {
    setBusy(true);
    setError('');
    try {
      const setup = await twoFactorApi.totpSetup();
      setTotp({ secret: setup.secret, qrCodeDataUrl: setup.qrCodeDataUrl });
      setView('totp-setup');
    } catch (err) {
      fail(err, 'Could not start authenticator setup');
    } finally {
      setBusy(false);
    }
  };

  const startEmail = async () => {
    setBusy(true);
    setError('');
    try {
      await twoFactorApi.emailSetup();
      setNotice('We sent a verification code to your email.');
      setView('email-setup');
    } catch (err) {
      fail(err, 'Could not send verification code');
    } finally {
      setBusy(false);
    }
  };

  const startDisable = async () => {
    setError('');
    setNotice('');
    if (method === 'email') {
      // Email disable needs a fresh code sent to the user.
      setBusy(true);
      try {
        await twoFactorApi.emailSetup();
        setNotice('We sent a verification code to your email.');
      } catch (err) {
        fail(err, 'Could not send verification code');
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setView('disable');
  };

  // ---- submit actions -----------------------------------------------------

  const confirmTotp = async () => {
    setBusy(true);
    setError('');
    try {
      await twoFactorApi.totpEnable(code.trim());
      setMethod('totp');
      reset();
    } catch (err) {
      fail(err, 'Invalid code');
    } finally {
      setBusy(false);
    }
  };

  const confirmEmail = async () => {
    setBusy(true);
    setError('');
    try {
      await twoFactorApi.emailEnable(code.trim());
      setMethod('email');
      reset();
    } catch (err) {
      fail(err, 'Invalid code');
    } finally {
      setBusy(false);
    }
  };

  const confirmDisable = async () => {
    setBusy(true);
    setError('');
    try {
      await twoFactorApi.disable(code.trim());
      setMethod('none');
      reset();
    } catch (err) {
      fail(err, 'Invalid code');
    } finally {
      setBusy(false);
    }
  };

  return {
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
  };
}
