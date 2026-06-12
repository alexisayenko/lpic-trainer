import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Quiz } from './components/Quiz';
import { CloudSync } from './components/CloudSync';
import { useAuth } from './lib/auth';

type Screen = 'home' | 'quiz';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const setToken = useAuth((s) => s.setToken);

  // The site is public read-only; quizzing unlocks by visiting once with ?token=xxx.
  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    if (token) {
      setToken(token);
      url.searchParams.delete('token');
      window.history.replaceState(null, '', url);
    }
  }, [setToken]);

  return (
    <div className="min-h-full bg-slate-900">
      <CloudSync />
      {screen === 'quiz' ? (
        <Quiz onExit={() => setScreen('home')} />
      ) : (
        <Dashboard onStart={() => setScreen('quiz')} />
      )}
    </div>
  );
}
