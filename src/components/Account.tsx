import { useAuth } from '../lib/auth';
import { cloudEnabled } from '../lib/api';

export function Account() {
  const setToken = useAuth((s) => s.setToken);

  if (!cloudEnabled) {
    return (
      <p className="text-xs text-slate-500">
        Stats are saved on this device. Cloud sync is not configured.
      </p>
    );
  }

  // Cloud is on, so App's login gate guarantees a token exists here.
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
