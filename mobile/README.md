# mobile — iOS app (Capacitor)

The iOS app is the web app wrapped in a native shell with
[Capacitor](https://capacitorjs.com/). **The UI is 100% shared with web** —
no rewritten screens, no separate codebase. The native Xcode project lives in
[`../ios/`](../ios/); config is [`../capacitor.config.ts`](../capacitor.config.ts)
(appId `org.isayenko.lpic`, appName `LPIC-2 Trainer`, webDir `dist`).

## How it works

- `npm run build` produces `dist/` exactly as for web — including the baked-in
  `VITE_API_URL` from `.env.production`, so the app talks to the live sync API
  at `api.isayenko.org`.
- `npx cap sync ios` copies `dist/` into `ios/App/App/public` (a git-ignored
  build artifact) and updates native plugins. Capacitor 8 uses Swift Package
  Manager — no CocoaPods needed.
- Progress persists in the WKWebView's `localStorage` via the same Zustand
  `persist` store; cloud sync works unchanged (native WebView requests are
  same-origin-less, so CORS is a non-issue).

## Build & run (Mac)

```bash
npm run build         # web bundle → dist/
npx cap sync ios      # dist/ → ios/App/App/public + plugin update
npx cap open ios      # open the project in Xcode, run from there
```

Or build/run on the simulator from the CLI without opening Xcode:

```bash
npx cap run ios       # pick a simulator, builds + launches
# or signing-free compile check:
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build
```

Repeat `npm run build && npx cap sync ios` after any web-code change — the
shell loads the copied bundle, not the dev server.

## Shipping

Device builds and TestFlight/App Store distribution need a signing team set on
the `App` target in Xcode (not configured yet).
