import { useTokenConnect } from '../lib/useTokenConnect';

/** Full-screen gate: a valid sync token is required before using the app. */
export function Login() {
  const { value, setValue, status, error, connect } = useTokenConnect();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold text-slate-100">LPIC-2 (Exam 202-450) Trainer</h1>
          <p className="text-sm text-slate-400">Enter your sync token to continue.</p>
        </div>
        <input
          type="password"
          autoFocus
          value={value}
          placeholder="sync token"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && connect()}
          className="w-full px-3 py-2 rounded-md border border-slate-700 bg-slate-800/60 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-600"
        />
        <button
          type="button"
          onClick={connect}
          disabled={status === 'checking'}
          className="w-full py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-60"
        >
          {status === 'checking' ? 'Checking…' : 'Continue'}
        </button>
        {status === 'error' && <p className="text-sm text-rose-400 text-center">{error}</p>}
      </div>
    </div>
  );
}
