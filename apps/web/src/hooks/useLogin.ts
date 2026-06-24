import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { authApi, twoFactorApi } from '../lib/api';

export function useLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });

  // Set when the API responds with a 2FA challenge instead of a session token.
  const [challenge, setChallenge] = useState<{ token: string; method: 'email' | 'totp' } | null>(null);
  const [code, setCode] = useState('');

  // Tokens are set as httpOnly cookies by the server; we only keep the user profile.
  const completeAuth = (user: any) => {
    setAuth(user);
    navigate('/');
  };

  // One-click sign-in as the pre-seeded recruiter demo customer.
  const demoLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await authApi.login({
        email: 'recruiter@demo.com',
        password: (import.meta as any).env?.VITE_DEMO_PASSWORD || '',
      });
      if (result.requiresTwoFactor) {
        setChallenge({ token: result.challengeToken, method: result.method });
        return;
      }
      completeAuth(result.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Demo sign-in is unavailable right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      if (isLogin) {
        const result = await authApi.login({ email: form.email, password: form.password });
        if (result.requiresTwoFactor) {
          setChallenge({ token: result.challengeToken, method: result.method });
          return;
        }
        completeAuth(result.user);
      } else {
        const result = await authApi.register({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
        });
        completeAuth(result.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    setIsLoading(true);
    setError('');
    try {
      const result = await twoFactorApi.verifyLogin({
        challengeToken: challenge.token,
        code: code.trim(),
      });
      completeAuth(result.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToCredentials = () => {
    setChallenge(null);
    setCode('');
    setError('');
  };

  return {
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
  };
}
