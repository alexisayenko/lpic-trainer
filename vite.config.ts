import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from the root of the custom domain https://lpic.isayenko.org/.
// Override with VITE_BASE=/lpic-trainer/ to preview under the github.io subpath.
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
});
