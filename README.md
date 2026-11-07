# HN Reader

**Live demo: https://informramiz.github.io/rn-showcase/** (web build of the same app, best viewed at phone width)

A Hacker News client built with React Native (Expo, SDK 58) and TypeScript. It reads the public [HN Firebase API](https://github.com/HackerNews/API), needs no API key, and works offline from cached data.

Built by Ramiz Raja as a small but complete example of production-style React Native: typed API layer, server-state caching, persisted local state, tests, CI and release config.

## Features

- Top, New, Best, Ask and Show feeds with infinite scroll (the ID list is paginated, items are fetched in batches).
- Story detail with a nested, collapsible comment tree. Replies load the first time you expand a comment.
- Links open in the in-app browser (`expo-web-browser`).
- Bookmarks saved on device, and reading history (read stories are dimmed).
- Pull to refresh, loading skeletons, error state with retry, offline banner. Cached data stays visible offline.
- Light and dark theme following the system, with an override in Settings. Settings also has clear cache and a privacy link (placeholder URL).

## Screenshots

Captured on an iOS Simulator (iPhone, Expo Go): stories, story detail with an expanded comment, saved, settings in dark mode.

| Stories                                                    | Story detail                                              | Saved                                                        | Settings (dark)                                                  |
| ---------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| <img src="docs/screenshots/ios-1-stories.png" width="200"> | <img src="docs/screenshots/ios-2-detail.png" width="200"> | <img src="docs/screenshots/ios-3-bookmarks.png" width="200"> | <img src="docs/screenshots/ios-4-settings-dark.png" width="200"> |

## Architecture

```
app/                    Expo Router routes (thin: wire hooks to components)
  _layout.tsx           Providers: persisted QueryClient, theme-aware Stack
  (tabs)/               Stories, Saved, History, Settings
  story/[id].tsx        Story detail and comments
src/
  api/                  fetch wrapper, typed errors, HN endpoints, types
  hooks/                TanStack Query hooks, comment thread hook, online state
  store/                Zustand stores: bookmarks, history, settings
  lib/                  pure helpers: comment tree flattening, formatting, storage
  components/           StoryRow, StoryList, CommentRow, skeletons, error and offline UI
  theme/                light and dark palettes, useTheme
  __tests__/            Jest + React Native Testing Library
.maestro/               UI smoke flow
```

### Data flow

1. A screen calls a hook (`useStories`, `useItem`, `useCommentThread`). Components never call `fetch`.
2. Hooks call `src/api`, which uses `getJson` (timeout via `AbortController`) and throws `ApiError` with a `kind` (`network`, `timeout`, `http`, `parse`, `not_found`).
3. TanStack Query caches results and retries (not for `not_found`). The cache is persisted to AsyncStorage for 24 hours, so a cold start offline still shows the last feed.
4. NetInfo feeds `onlineManager`, so queries pause offline instead of failing, and resume when the connection returns.
5. Zustand stores hold user state (bookmarks, history, theme mode) and persist it on their own.

### Why each library

- **Expo Router**: file-based routes, typed routes, deep link scheme for free.
- **TanStack Query**: caching, retries, request cancellation and persistence are solved problems. `useInfiniteQuery` fits the paginated feed.
- **Zustand**: tiny stores, no provider, easy to test with `setState`.
- **FlashList**: recycled rows for long feeds.
- **AsyncStorage**: see decisions below.
- **Jest, RNTL**: tests run without a device.

## Run

Requires Node 22+.

```bash
npm install
npx expo start        # then open in Expo Go, or press i / a for a simulator
```

## Test

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run doctor        # expo-doctor
npx expo export       # bundle sanity check
```

The tests cover the API layer (success, null item, HTTP error, network error, bad JSON, timeout, batching), the comment tree logic, the stores, and four screen tests (feed loading and navigation, error and retry, bookmarks, settings).

`.maestro/smoke.yaml` is a UI flow (launch, scroll, open a story, bookmark it, check the Saved tab). Run it against an installed build with `maestro test .maestro/smoke.yaml`.

## Web demo

Web screenshots (390px wide):

| Stories                                                                                                                                                                        | Story detail                                              | Saved                                                        | Settings (dark)                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| <img src="docs/screenshots/web-1-stories.png" width="200">                                                                                                                     | <img src="docs/screenshots/web-2-detail.png" width="200"> | <img src="docs/screenshots/web-3-bookmarks.png" width="200"> | <img src="docs/screenshots/web-4-settings-dark.png" width="200"> |
| `npx expo export -p web` builds a single-page app. `.github/workflows/pages.yml` deploys it to GitHub Pages under `/rn-showcase` (`experiments.baseUrl`). Known limits on web: |

- Pages has no SPA fallback, so the workflow copies `index.html` to `404.html`. Opening a deep link such as `/story/123` directly works, but the server answers HTTP 404 before the app loads.
- Storage uses `localStorage` through AsyncStorage, so bookmarks and cache are per browser.
- Pull to refresh does not exist with a mouse. Reload the page instead.
- "Open link" opens a new browser tab instead of an in-app browser.

## Store release

The app is configured for EAS (`eas.json`, bundle id `com.codebyramiz.hnreader`). Store submission is deferred, and no builds have been made.

## Release config

`app.json` sets the bundle id and package to `com.codebyramiz.hnreader`. `eas.json` has `development`, `preview` and `production` profiles. Icon and splash in `assets/` are generated placeholders.

## Decisions and trade-offs

- **AsyncStorage, not MMKV.** MMKV is faster and synchronous, but it needs native code, so it does not run in Expo Go. AsyncStorage works in Expo Go and dev clients with no setup. The stored data here is small (bookmarks, history, one cache blob), so speed does not matter. Both plug into Zustand and TanStack persisters, so switching is a small change in `src/lib/storage.ts` and `src/hooks/queryClient.ts`.
- **Feed tabs are chips, not bottom tabs.** Five feeds plus Saved, History and Settings is too many bottom tabs. The feeds are a chip row on the Stories screen, and the bottom bar has four tabs.
- **Comments load lazily and are collapsed by default.** Some threads have hundreds of comments. Only top-level comments load at first, replies load on expand. The tree is flattened into a row list by a pure function (`flattenThread`), which is why it is easy to test.
- **Comment text is converted to plain text.** HN comments use a small HTML subset. Links become bare URLs. Rendering real HTML would add a dependency for little gain here.
- **Refresh keeps only page one.** Pull to refresh drops the cached ID list and the extra pages, so it does not re-download everything you scrolled through.
- **Clear cache also clears history.** Bookmarks are kept. Bookmarks store a summary of the story, so they open offline from the list, but story detail and comments need a cached or live fetch.
- **The privacy link is a placeholder** (`example.com`). Replace `PRIVACY_URL` in `app/(tabs)/settings.tsx` before release.
- **Local `watchman` is bypassed in the test script** (`--watchman=false`) so tests do not depend on it.
