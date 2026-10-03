'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [verifyUrl, setVerifyUrl] = useState(''),
    [registeredEmail, setRegisteredEmail] = useState(''),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      if (mode === 'register') {
        setRegisteredEmail(String(data.email));
        if (j.verificationUrl) setVerifyUrl(j.verificationUrl);
        else
          setNotice(
            j.emailDeliveryFailed
              ? 'Account created, but the email could not be delivered. You can retry below.'
              : 'Your account is ready. Check your inbox for the verification link.',
          );
        return;
      }
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      if (j.verificationUrl) setVerifyUrl(j.verificationUrl);
      else
        setNotice(j.message || 'Check your inbox for the verification link.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === 'register' && (
        <label className="block text-sm">
          Name
          <input
            name="name"
            autoComplete="name"
            className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-3"
          />
        </label>
      )}
      <label className="block text-sm">
        Email
        <input
          required
          name="email"
          type="email"
          autoComplete="email"
          className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-3"
        />
      </label>
      <label className="block text-sm">
        Password
        <input
          required
          name="password"
          type="password"
          minLength={mode === 'register' ? 10 : 1}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-3"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-amber-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-emerald-300">
          {notice}
        </p>
      )}
      {verifyUrl && (
        <div className="rounded-lg border border-line p-3 text-sm">
          <p>
            {process.env.NODE_ENV === 'development'
              ? 'Development verification link is ready.'
              : 'Verification email sent.'}
          </p>
          <Link
            className="mt-2 inline-block text-brand underline"
            href={verifyUrl}
          >
            Verify email
          </Link>
        </div>
      )}
      {registeredEmail && mode === 'register' && !verifyUrl && (
        <button
          type="button"
          disabled={busy}
          onClick={resend}
          className="w-full text-sm text-brand underline disabled:opacity-60"
        >
          Resend verification email
        </button>
      )}
      <button
        disabled={busy}
        className="w-full rounded-lg bg-indigo-500 px-4 py-3 font-medium hover:bg-indigo-400 disabled:opacity-60"
      >
        {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
      </button>
      <p className="text-sm text-muted">
        {mode === 'login' ? (
          <>
            New to CloudNest?{' '}
            <Link className="text-brand" href="/register">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link className="text-brand" href="/login">
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
