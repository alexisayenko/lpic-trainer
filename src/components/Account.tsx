import { useAuth } from '../lib/auth';
import { cloudEnabled } from '../lib/api';

export function Account() {
  const setToken = useAuth((s) => s.setToken);
  const token = useAuth((s) => s.token);

  if (!cloudEnabled) {
    return (
      <p className="text-xs text-slate-500">
        Stats are saved on this device. Cloud sync is not configured.
      </p>
    );
  }

  if (!token) {
    return <p className="text-xs text-slate-500">Read-only</p>;
  }

  return (
    <button
      type="button"
      onClick={() => setToken(null)}
      className="text-sm text-slate-400 hover:text-slate-200"
    >
      Disconnect
    </button>
  );
}
