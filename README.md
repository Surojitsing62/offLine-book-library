# Bookshelf — offline Gutenberg library (Expo + React Native + Skia)

## Setup
```bash
npx create-expo-app@latest bookshelf --template blank-typescript
cd bookshelf
npx expo install expo-sqlite @shopify/react-native-skia react-native-reanimated \
  react-native-safe-area-context react-native-screens @react-native-community/netinfo \
  @expo/vector-icons expo-status-bar
npm i @react-navigation/native @react-navigation/native-stack
```
Copy `App.tsx` and `src/` over the generated project, then:
```bash
npx expo start          # try Expo Go first
npx expo run:android    # or run:ios — use a dev build if Skia won't load in Expo Go
```

## How the requirements are met
| Requirement | Where |
|---|---|
| Navigation Browse ↔ Details | `App.tsx` (native stack) |
| SQLite persistence | `src/db.ts`: `saved_books`, `browse_cache` (page 1 per filter, max 12), `kv` (last filters) |
| Cached first, refresh in background | `Browse.tsx → load()`: reads cache, then fetches; request-id guard drops stale responses |
| Cached vs fresh indicator | `Banner` pill: "Cached 3 h ago · refreshing…" / "Live from Gutenberg" / offline / error |
| Saved books offline | Saved tab reads SQLite only; Details checks SQLite before the network |
| Offline Details, not saved | Meaningful error with next step (`Details.tsx`, state `offline`) |
| Small payloads | `api.ts → slim()` keeps ≤8 subjects, ≤6 shelves, 5 format links, cover URL only (no images/text) |
| Infinite scroll | `onEndReached` → `loadMore()`; extra pages are in memory only, not cached |

## Skia
- `SkeletonCard` / `SkeletonGrid`: shimmering placeholders shaped like the real cards. Shown on first load with no cache, while the next page loads at the bottom of the list, and while Details loads
- `Aurora`: animated radial-gradient light behind each screen
- `Cover`: generated cover per book id; real cover fades in on top, so offline books never show a blank
- `SaveButton`: ribbon icon with animated fill
