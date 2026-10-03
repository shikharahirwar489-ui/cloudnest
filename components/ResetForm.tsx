'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function ResetForm({ token }: { token: string }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        const form = e.currentTarget;
        const values = Object.fromEntries(new FormData(form));
        if (values.password !== values.confirmPassword) {
          setError('The passwords do not match.');
          return;
        }
        setBusy(true);
        try {
          const r = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ token, password: values.password }),
          });
          const j = await r.json();
          if (!r.ok) setError(j.error);
          else router.push('/login');
        } catch {
          setError(
            'Could not reach CloudNest. Check your connection and try again.',
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block text-sm">
        New password
        <input
          name="password"
          type="password"
          minLength={10}
          required
          className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-3"
        />
      </label>
      <label className="block text-sm">
        Confirm new password
        <input
          name="confirmPassword"
          type="password"
          minLength={10}
          required
          autoComplete="new-password"
          className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-3"
        />
      </label>
      <button
        disabled={busy}
        className="w-full rounded-lg bg-indigo-500 px-4 py-3 disabled:opacity-60"
      >
        {busy ? 'Updating…' : 'Update password'}
      </button>
      {error && (
        <p role="alert" className="text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
