import { useState } from 'react';
import { TopicPicker } from './components/TopicPicker';
import { Quiz } from './components/Quiz';
import { Stats } from './components/Stats';
import { CloudSync } from './components/CloudSync';

type Screen = 'pick' | 'quiz' | 'stats';

export default function App() {
  const [screen, setScreen] = useState<Screen>('pick');

  return (
    <div className="min-h-full bg-slate-900">
      <CloudSync />
      {screen === 'pick' && (
        <TopicPicker onStart={() => setScreen('quiz')} onStats={() => setScreen('stats')} />
      )}
      {screen === 'quiz' && <Quiz onExit={() => setScreen('pick')} />}
      {screen === 'stats' && <Stats onExit={() => setScreen('pick')} />}
    </div>
  );
}
