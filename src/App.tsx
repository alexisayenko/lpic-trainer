import { useState } from 'react';
import { TopicPicker } from './components/TopicPicker';
import { Quiz } from './components/Quiz';

type Screen = 'pick' | 'quiz';

export default function App() {
  const [screen, setScreen] = useState<Screen>('pick');

  return (
    <div className="min-h-full bg-slate-900">
      {screen === 'pick' ? (
        <TopicPicker onStart={() => setScreen('quiz')} />
      ) : (
        <Quiz onExit={() => setScreen('pick')} />
      )}
    </div>
  );
}
