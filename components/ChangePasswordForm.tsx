'use client';

import { useState } from 'react';

export function ChangePasswordForm() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (values.newPassword !== values.confirmPassword) {
      setError('The new passwords do not match.');
      setBusy(false);
      return;
    }
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'Unable to change password.');
      form.reset();
      setMessage(result.message);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to change password.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <label className="block text-sm">
        Current password
        <input
          required
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-3"
        />
      </label>
      <label className="block text-sm">
        New password
        <input
          required
          name="newPassword"
          type="password"
          minLength={10}
          autoComplete="new-password"
          className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-3"
        />
        <span className="mt-1 block text-xs text-muted">
          Use at least 10 characters.
        </span>
      </label>
      <label className="block text-sm">
        Confirm new password
        <input
          required
          name="confirmPassword"
          type="password"
          minLength={10}
          autoComplete="new-password"
          className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-3"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-amber-300">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-emerald-300">
          {message}
        </p>
      )}
      <button
        disabled={busy}
        className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium disabled:opacity-60"
      >
        {busy ? 'Saving…' : 'Change password'}
      </button>
    </form>
  );
}
