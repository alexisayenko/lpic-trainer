import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served under https://<user>.github.io/Lpic-trainer/ in production.
// Override with VITE_BASE=/ for previews on a custom domain or other host.
const base = process.env.VITE_BASE ?? '/Lpic-trainer/';

export default defineConfig({
  base,
  plugins: [react()],
});
