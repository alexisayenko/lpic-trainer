# mobile — iOS app (React Native / Expo)

> Status: **placeholder.** Not scaffolded yet. This folder will hold the
> React Native (Expo) app targeting iOS.

## Plan (see also [`../docs/quizzer-concept.md`](../docs/quizzer-concept.md))

- **Stack:** Expo (managed) + TypeScript, Expo Router, Zustand, NativeWind.
- **Reused from the web app (ports as-is):** `store.ts`, `lib/select.ts`,
  `lib/api.ts`, `lib/auth.ts`, `types.ts`, `data/questions/`.
  - Only change: Zustand `persist` storage localStorage → AsyncStorage.
- **Rewritten in RN primitives:** the screens (`Quiz`, `Stats`, `TopicPicker`,
  `Account`) — `div`→`View`, `button`→`Pressable`, NativeWind keeps the
  Tailwind class names.
- **Backend:** unchanged — talks to the live sync API at `api.isayenko.org`
  (native requests send no Origin, so CORS is a non-issue).
- **Build/ship:** `expo run:ios` for the simulator; EAS for TestFlight/App Store
  (cloud builds, so it works from Windows too).
