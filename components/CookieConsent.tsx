'use client';
import { useEffect, useState } from 'react';
export function CookieConsent() {
  const [ready, setReady] = useState(false),
    [open, setOpen] = useState(false),
    [hasChoice, setHasChoice] = useState(false);
  useEffect(() => {
    setHasChoice(!!localStorage.getItem('cloudnest-cookie-choice'));
    setReady(true);
  }, []);
  function choose(value: string) {
    localStorage.setItem('cloudnest-cookie-choice', value);
    setHasChoice(true);
    setOpen(false);
  }
  if (!ready) return null;
  return (
    <>
      {hasChoice && !open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-muted underline"
        >
          Cookie preferences
        </button>
      ) : (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-xl border border-line bg-panel p-5 shadow-2xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Cookie notice</p>
              <p className="mt-1 text-sm text-muted">
                CloudNest uses an essential sign-in cookie and browser storage
                for your preferences. Analytics and advertising cookies are not
                enabled.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => choose('acknowledged')}
                className="rounded-lg bg-indigo-500 px-3 py-2 text-sm"
              >
                Got it
              </button>
              {open && (
                <button
                  onClick={() => choose('essential')}
                  className="rounded-lg border border-line px-3 py-2 text-sm"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
