import { useState } from 'react';
import { TopicPicker } from './components/TopicPicker';
import { Quiz } from './components/Quiz';
import { Stats } from './components/Stats';
import { CloudSync } from './components/CloudSync';
import { Login } from './components/Login';
import { useAuth } from './lib/auth';
import { cloudEnabled } from './lib/api';

type Screen = 'pick' | 'quiz' | 'stats';

export default function App() {
  const [screen, setScreen] = useState<Screen>('pick');
  const token = useAuth((s) => s.token);
  // When cloud sync is configured, a valid token is required to enter the app.
  const gated = cloudEnabled && !token;

  return (
    <div className="min-h-full bg-slate-900">
      <CloudSync />
      {gated ? (
        <Login />
      ) : (
        <>
          {screen === 'pick' && (
            <TopicPicker onStart={() => setScreen('quiz')} onStats={() => setScreen('stats')} />
          )}
          {screen === 'quiz' && (
            <Quiz onExit={() => setScreen('pick')} onFinish={() => setScreen('stats')} />
          )}
          {screen === 'stats' && <Stats onExit={() => setScreen('pick')} />}
        </>
      )}
    </div>
  );
}
