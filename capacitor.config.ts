import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.isayenko.lpic',
  appName: 'LPIC-2 Trainer',
  webDir: 'dist',
  plugins: {
    // Native HTTP for fetch/XHR: the WKWebView origin is capacitor://localhost,
    // which the sync API's CORS allowlist rejects; native requests send no Origin.
    CapacitorHttp: { enabled: true },
  },
};

export default config;
