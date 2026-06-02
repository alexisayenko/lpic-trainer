import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { cloudEnabled, checkToken } from '../lib/api';

export function Account() {
  const token = useAuth((s) => s.token);
  const setToken = useAuth((s) => s.setToken);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'error'>('idle');
  const [error, setError] = useState('');

  if (!cloudEnabled) {
    return (
      <p className="text-xs text-slate-500">
        Stats are saved on this device. Cloud sync is not configured.
      </p>
    );
  }

  if (token) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-400">Syncing to your server</span>
        <button
          type="button"
          onClick={() => setToken(null)}
          className="text-slate-400 hover:text-slate-200"
        >
          Disconnect
        </button>
      </div>
    );
  }

  const connect = async () => {
    const t = value.trim();
    if (!t) return;
    setStatus('checking');
    setToken(t);
    try {
      await checkToken();
      setStatus('idle');
    } catch (e) {
      setToken(null);
      setError(e instanceof Error ? e.message : 'Could not connect.');
      setStatus('error');
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-400">Paste your sync token to sync stats across devices.</p>
      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          placeholder="sync token"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && connect()}
          className="flex-1 px-3 py-2 rounded-md border border-slate-700 bg-slate-800/60 text-slate-200 placeholder-slate-500"
        />
        <button
          type="button"
          onClick={connect}
          disabled={status === 'checking'}
          className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60"
        >
          {status === 'checking' ? 'Connecting…' : 'Connect'}
        </button>
      </div>
      {status === 'error' && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
