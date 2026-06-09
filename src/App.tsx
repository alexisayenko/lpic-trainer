import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Quiz } from './components/Quiz';
import { CloudSync } from './components/CloudSync';
import { Login } from './components/Login';
import { useAuth } from './lib/auth';
import { cloudEnabled } from './lib/api';

type Screen = 'home' | 'quiz';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const token = useAuth((s) => s.token);
  // When cloud sync is configured, a valid token is required to enter the app.
  const gated = cloudEnabled && !token;

  return (
    <div className="min-h-full bg-slate-900">
      <CloudSync />
      {gated ? (
        <Login />
      ) : screen === 'quiz' ? (
        <Quiz onExit={() => setScreen('home')} onFinish={() => setScreen('home')} />
      ) : (
        <Dashboard onStart={() => setScreen('quiz')} />
      )}
    </div>
  );
}
