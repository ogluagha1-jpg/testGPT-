# Currentline

An Expo / React Native Xtream player for iPhone and Android. Connect with your provider's server URL, username, and password to browse live TV and on-demand movies.

## Features

- Cinema-style Discover screen with selectable featured titles and horizontal movie shelves
- Responsive poster grids, live channel cards, category filters, search, and A–Z sorting
- Xtream authentication and channel/movie catalogs
- Native video playback with fullscreen controls (HLS for live channels)
- Favorites saved on the device, separated by server and account
- Optional login storage using iOS Keychain / Android encrypted storage; sign-out deletes the saved login
- Demo catalog with bundled original poster artwork (demo titles do not stream)
- Provider artwork when available, with a styled fallback for missing or failed images
- Loading, empty, cancellation, connection-error, and playback-error states

## Develop

Use Node.js 24 and npm. This project uses Expo SDK 58.

```sh
npm ci
npm start
```

Open the project using a compatible Expo Go app on your phone, or use an Expo development build. The phone must be able to reach the development server. For locally installed emulators use `npm run android` or `npm run ios` (the iOS simulator requires macOS and Xcode).

For native builds with the app's HTTP transport configuration, run `npx expo run:android` or `npx expo run:ios` on a machine with the relevant native toolchain. Store distribution requires your own Apple/Google developer accounts, signing setup, and unique application identifiers.

```sh
npm run lint
npm run typecheck
npm test
npm run export
npx playwright install chromium
npm run test:e2e
```

In restricted cloud environments use `EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1` for Expo commands to avoid optional remote checks. Set `npm_config_cache=/tmp/npm-cache` if the default npm cache is unavailable. For browser tests with an existing system Chromium, use `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`. Use the existing checkout; cloud tasks are already isolated and do not need a separate Git worktree.

## Connect

Enter a base server URL such as `https://provider.example:8443`, plus the username and password supplied by your provider. A base path is supported. The app calls `player_api.php` and uses the standard `/live/username/password/id.m3u8` and `/movie/username/password/id.extension` routes. Only active accounts can connect.

HTTPS is recommended. HTTP is supported by native build configuration for providers that require it, but transmits credentials and media unencrypted. Expo Go's transport policies may differ. Credentials necessarily appear in Xtream requests and stream URLs; do not share network traces or provider URLs publicly. They are never written to application logs. Web mode keeps credentials only in memory, and a provider must allow browser CORS; an HTTPS web page cannot play insecure HTTP media. Native iOS and Android are the primary targets.

There is no content service or backend bundled with this app. Series, EPG, catch-up, downloads, casting, and DRM are outside this first version. Playback support depends on the device and the provider's codec/container; HLS and MP4 with supported codecs are the best starting point. Some MKV or other streams may not play on iOS.

## Validation scope

Automated tests cover URL handling, catalog parsing, authentication, errors, and cancellation with mocked server responses. A successful export verifies bundling, not native playback. Validate login, live playback, movie seeking, fullscreen, secure persistence, and sign-out on physical iPhone and Android devices with your provider before distribution. Do not put real credentials in this repository or send them in chat.
