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
- Light and dark theme following the system, with an override in Settings. Settings also has clear cache and remove bookmarks.

## Screenshots

Captured on an iOS Simulator (iPhone, Expo Go): stories, story detail with an expanded comment, saved, settings in dark mode.

| Stories                                                    | Story detail                                              | Saved                                                        | Settings (dark)                                                  |
| ---------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| <img src="docs/screenshots/ios-1-stories.png" width="200"> | <img src="docs/screenshots/ios-2-detail.png" width="200"> | <img src="docs/screenshots/ios-3-bookmarks.png" width="200"> | <img src="docs/screenshots/ios-4-settings-dark.png" width="200"> |

## Architecture

**Feature-based modules, MVVM with hooks:** Views → ViewModel hooks → TanStack Query (server state) / Zustand (client state) → typed API layer.

```
 View (Screen component)      renders state, forwards user events
        │  calls
        ▼
 ViewModel hook               use<Screen>ViewModel() → { state, actions }
        │  composes
        ├──────────────► TanStack Query hooks   server state: feeds, items, cache, retries
        │                        │
        │                        ▼
        │                 typed API layer       fetch wrapper, ApiError, HN endpoints
        └──────────────► Zustand stores         client state: bookmarks, history, theme (persisted)
```

Each screen is a plain component that calls one ViewModel hook and renders what it returns. The ViewModel owns the logic (feed selection, pagination, confirmations, bookmark toggling) and composes query hooks and stores, so it is tested with `renderHook` and no UI. Route files in `app/` only re-export a screen, which keeps navigation separate from features.

### Folder map

```
app/                          Expo Router routes: thin re-exports of feature screens, plus the two layouts
src/
  features/
    stories/                  StoriesScreen, useStoriesViewModel, useStories (infinite query)
    story-detail/             StoryDetailScreen, useStoryDetailViewModel, useItem, comment tree
                              (CommentThread, CommentRow, useCommentThread, comments.ts helpers)
    bookmarks/                BookmarksScreen, useBookmarksViewModel, Zustand store
    history/                  HistoryScreen, useHistoryViewModel, Zustand store, useOpenStory
    settings/                 SettingsScreen, useSettingsViewModel, Zustand store (theme mode)
  shared/
    api/                      http client (timeout), ApiError, HN endpoints, types
    ui/                       Button, Chip, Skeleton, ErrorState, OfflineBanner, StoryList, StoryRow
    query/                    QueryClient setup, retry policy, AsyncStorage persister
    theme/                    palettes, spacing, useTheme
    i18n/                     strings
    lib/                      storage, formatting
    hooks/                    useOnline (NetInfo)
  __tests__/                  shared test helpers and cross-screen tests
.maestro/                     UI smoke flow
```

Feature tests live next to their feature in `__tests__/`. Imports use the `@/` alias for `src/`. Dependencies point one way: features use `shared`, never the reverse (one exception: `shared/theme` reads the theme mode from the settings store). Features import each other only through stores and hooks (for example story detail writes to the bookmarks and history stores). `StoryList` and `StoryRow` sit in `shared/ui` as presentational components because three features render them, and they take the read state and the open handler as props.

### Data flow

1. A screen calls its ViewModel. Components never call `fetch`.
2. The ViewModel uses query hooks, which call the API layer. `getJson` adds a timeout via `AbortController` and throws `ApiError` with a `kind` (`network`, `timeout`, `http`, `parse`, `not_found`).
3. TanStack Query caches results and retries (not for `not_found`). The cache is persisted to AsyncStorage for 24 hours, so a cold start offline still shows the last feed.
4. NetInfo feeds `onlineManager`, so queries pause offline instead of failing, and resume when the connection returns.
5. Zustand stores hold user state (bookmarks, history, theme mode) and persist it on their own.

### Why Zustand and TanStack Query

They hold different kinds of state, so each is used for one job.

- **TanStack Query for server state.** Data that lives on the HN API and can go stale: caching, request de-duplication, retries, cancellation, pagination (`useInfiniteQuery`), offline pause and persistence are solved there, and none of it is hand-written.
- **Zustand for client state.** Data the user owns (bookmarks, history, theme): tiny stores, no provider, built-in persistence middleware, and tests just call `setState`. It is not mixed with the query cache, so clearing the cache never touches bookmarks.

### Other libraries

- **Expo Router**: file-based routes, typed routes, deep link scheme for free.
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
npm test -- --coverage
npm run doctor        # expo-doctor
npx expo export       # bundle sanity check
```

Tests mock at the `fetch` boundary and query by role or visible text. They cover the API layer (including payload validation, errors, timeout, batching), `describeError`, the query client (retry policy, cache clearing), the stores, online/offline state and banner, every ViewModel hook (`renderHook`), the story screen (loading, error with retry, bookmark toggle), the comment thread (lazy expand, retry), and the feed, bookmarks, history and settings screens (including the remove-all confirmation).

`npm test -- --coverage` currently reports about 95% lines. `jest.config.js` enforces a floor (88% statements and lines, 85% functions, 82% branches), and CI runs with coverage. Not covered: the tab layout and root layout wiring, which the Maestro smoke flow exercises on a device.

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

- **AsyncStorage, not MMKV.** MMKV is faster and synchronous, but it needs native code, so it does not run in Expo Go. AsyncStorage works in Expo Go and dev clients with no setup. The stored data here is small (bookmarks, history, one cache blob), so speed does not matter. Both plug into Zustand and TanStack persisters, so switching is a small change in `src/shared/lib/storage.ts` and `src/shared/query/queryClient.ts`.
- **Feed tabs are chips, not bottom tabs.** Five feeds plus Saved, History and Settings is too many bottom tabs. The feeds are a chip row on the Stories screen, and the bottom bar has four tabs.
- **Comments load lazily and are collapsed by default.** Some threads have hundreds of comments. Only top-level comments load at first, replies load on expand. The tree is flattened into a row list by a pure function (`flattenThread`), which is why it is easy to test.
- **Comment text is converted to plain text.** HN comments use a small HTML subset. Links become bare URLs. Rendering real HTML would add a dependency for little gain here.
- **Refresh keeps only page one.** Pull to refresh drops the cached ID list and the extra pages, so it does not re-download everything you scrolled through.
- **Clear cache also clears history.** Bookmarks are kept. Bookmarks store a summary of the story, so they open offline from the list, but story detail and comments need a cached or live fetch.
- **No privacy policy link.** The app collects no data: no accounts, analytics or tracking. Bookmarks, history and settings stay on the device. A store release would still need a hosted policy URL.
- **Local `watchman` is bypassed in the test script** (`--watchman=false`) so tests do not depend on it.
