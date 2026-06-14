import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
import '@fontsource/jetbrains-mono/400.css';
import './index.css';

if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('native');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
