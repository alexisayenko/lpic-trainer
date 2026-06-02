import { useState } from 'react';
import { cloudEnabled } from '../lib/supabase';
import { useSession } from '../lib/useSession';
import { signIn, signOut } from '../lib/sync';

export function Account() {
  const session = useSession();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  if (!cloudEnabled) {
    return (
      <p className="text-xs text-slate-500">
        Stats are saved on this device. Cloud sync is not configured.
      </p>
    );
  }

  if (session) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-400">
          Synced as <span className="text-slate-200">{session.user.email}</span>
        </span>
        <button
          type="button"
          onClick={() => signOut()}
          className="text-slate-400 hover:text-slate-200"
        >
          Sign out
        </button>
      </div>
    );
  }

  const send = async () => {
    if (!email.trim()) return;
    setStatus('sending');
    const { error } = await signIn(email.trim());
    if (error) {
      setError(error);
      setStatus('error');
    } else {
      setStatus('sent');
    }
  };

  if (status === 'sent') {
    return (
      <p className="text-sm text-emerald-300">
        Check {email} for a sign-in link, then return here — your stats will sync automatically.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-400">Sign in to sync your stats across devices.</p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          placeholder="you@example.com"
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          className="flex-1 px-3 py-2 rounded-md border border-slate-700 bg-slate-800/60 text-slate-200 placeholder-slate-500"
        />
        <button
          type="button"
          onClick={send}
          disabled={status === 'sending'}
          className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60"
        >
          {status === 'sending' ? 'Sending…' : 'Send link'}
        </button>
      </div>
      {status === 'error' && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
