import { useState } from 'react';
import { useAuth } from './auth';
import { checkToken } from './api';

type Status = 'idle' | 'checking' | 'error';

/** Shared token entry + validation used by both the Login gate and the Account panel. */
export function useTokenConnect() {
  const setToken = useAuth((s) => s.setToken);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

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

  return { value, setValue, status, error, connect };
}
