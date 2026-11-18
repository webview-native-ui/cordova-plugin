# Cordova Native UI

Render supported HTML and Ionic controls natively on iOS, or use Android Dynamic Color in your Cordova app. [Install the plugin](#install-from-npm), then [start Native UI](#start-native-ui) after Cordova and your Web app are ready.

## Requirements

- Cordova CLI 13, cordova-ios 8.1+ with Swift Package Manager, or cordova-android 15+.
- iOS native rendering requires iOS 26+ and Xcode 26+; older iOS uses the shared Web fallback. CocoaPods and older Cordova versions are not supported in this initial adapter.
- Ionic integration: `@ionic/core >=8.8.1 <10` in the application. The `/core` entry does not require Ionic.
- Android API 24+, SDK 36, JDK 21, Kotlin 2.2.20 and Compose. Android supports the shared app-local Compose extension path, not the iOS native toolbar/search feature set.

Add these preferences to your Cordova application's `config.xml` for Android:

```xml
<preference name="GradlePluginKotlinEnabled" value="true" />
<preference name="GradlePluginKotlinVersion" value="2.2.20" />
<preference name="AndroidGradlePluginVersion" value="8.13.0" />
<preference name="AndroidJavaSourceCompatibility" value="21" />
<preference name="AndroidJavaTargetCompatibility" value="21" />
<preference name="AndroidKotlinJVMTarget" value="21" />
```

## Install from npm

From your Cordova application root:

```sh
cordova plugin add @webview-native-ui/cordova-plugin@0.1.6
```

This installs the prepared native and JavaScript assets and saves the npm dependency in the Cordova project. You do not need to clone this repository, fetch Core or build the plugin. Direct Git URL installation is not supported because generated assets are not committed.

If your Web bundler uses a separate npm project, install the same version there as well:

```sh
npm install @webview-native-ui/cordova-plugin@0.1.6
```

When the Cordova app and bundler share a `package.json`, the dependency saved by `cordova plugin add` is sufficient. Keep `<script src="cordova.js"></script>` in your Cordova entry HTML, build your Web assets into the application's `www` directory, then run `cordova prepare` and rebuild the native app. Reloading Web assets alone does not update native code.

## Start Native UI

Cordova loads `window.NativeUI` from the bundled JavaScript module. Start after `deviceready`:

```js
document.addEventListener('deviceready', async () => {
  const handle = await window.NativeUI.enableNativeUI();
  // Call await handle.destroy() when your application permanently stops using it.
});
```

Bundled applications can import `enableNativeUI` from `@webview-native-ui/cordova-plugin/core` (standard HTML), or the package root (Ionic integration). Use one entry style in an application. The `/integration` and `/vertical-bars` subpaths mirror the shared APIs. The browser bundle includes its JavaScript dependencies; npm ESM imports use the declared runtime dependencies. No Capacitor JavaScript runtime is required.

App-local Swift renderers use `import CordovaNativeUI` and `NativeUI.register(...)`. Android renderers retain the shared `dev.rdlabo.capacitor.nativeui.NativeUI` namespace for compatibility; this name does not imply an Android Capacitor SDK dependency. See the [shared extension documentation](https://github.com/webview-native-ui/capacitor-plugin/blob/main/docs/native-ui-extensions.md) for renderer contracts.

On iOS, native activation stops WebView momentum by default. Pass `stopScrollOnActivate: false` to `enableNativeUI()` to preserve momentum. A new gesture resumes scrolling normally; no explicit resume call is needed.

On iOS, the adapter uses the same full-WebView coordinate space as Capacitor
(`contentInsetAdjustmentBehavior = .never`). Apply safe-area spacing in your page
CSS, for example with `env(safe-area-inset-top)`, rather than relying on automatic
scroll-view insets.

## Android Dynamic Color

The root and `/core` entries expose `getDynamicColorScheme()`, `addDynamicColorListener()` and `materialColorRoles`, matching the Capacitor API. Android 12+ supplies light/dark Material color schemes; older Android, iOS and Web return `available: false` with the current system appearance. This API is independent of Native UI projection.

```ts
import { getDynamicColorScheme, addDynamicColorListener } from '@webview-native-ui/cordova-plugin/core';

const colors = await getDynamicColorScheme();
const subscription = await addDynamicColorListener(async () => {
  const updated = await getDynamicColorScheme();
  // Apply the available scheme to your application's theme.
});
// When the consumer is destroyed:
await subscription.remove();
```

Android resume and configuration changes trigger the listener. No wallpaper or storage permissions are needed. Color extraction and role definitions are generated from the same pinned Capacitor source; the Cordova adapter only changes transport and lifecycle wiring.

## Migrating from the bundled iOS theme

Through version 0.1.5, this plugin shipped an iOS theme. Starting with 0.1.6, applications select and install their own theme. Apps using only the Cordova Native UI API can keep their existing imports and startup.

If your application imports the old theme entries:

1. Install `@rdlabo/ionic-theme-ios27` in the Web project. Pin `2.2.0` to keep the theme version bundled with Cordova 0.1.5.
2. Replace CSS imports from `@webview-native-ui/cordova-plugin/theme/css/*` with the corresponding `@rdlabo/ionic-theme-ios27/dist/css/*` files. Keep your current light/dark palette.
3. Import JavaScript helpers from `@rdlabo/ionic-theme-ios27`. If using its JavaScript integration, configure your Web bundler to resolve the exact import `@rdlabo/capacitor-native-ui/integration` to `@webview-native-ui/cordova-plugin/integration` so the theme and Cordova share runtime state.
4. Keep `enableNativeUI` imported from `@webview-native-ui/cordova-plugin` and start it once after `deviceready` and app mounting. Rebuild the Web assets and prepare the Cordova app.

## Toolbar button badges

Shared Core supports direct-child `ion-badge` elements in toolbar buttons:

```html
<ion-toolbar>
  <ion-buttons slot="end">
    <ion-button aria-label="3 notifications">
      <ion-icon name="ellipsis-horizontal" slot="icon-only"></ion-icon>
      <ion-badge color="primary">3</ion-badge>
    </ion-button>
  </ion-buttons>
</ion-toolbar>
```

On supported iOS native Vertical Bars, badges retain their text or empty unread indicator and follow the source Ionic background and text colors. The Web rail fallback preserves the badge and its display state. Count changes, color-only changes, hiding and removal update the existing action. Use a completely empty `<ion-badge></ion-badge>` for an indicator, without spaces or line breaks inside it. Include notification state in the action's accessible label.

Update both the Cordova project plugin and the Web project's npm dependency, run `cordova prepare`, and rebuild the native app. Loading new Web assets alone does not update the native renderer.

## Modal snapshot fix

Version 0.1.5 includes Engine 1.0.11, which fixes modal rail button images turning opaque gray on iOS. Transparent modal captures retain their original Glass filtering; composited window captures keep the cold-launch workaround. No theme update or markup change is required.

Update both the Cordova project plugin and the Web project's npm dependency to 0.1.5 or later, run `cordova prepare`, and rebuild the native app. Web asset reloads alone do not update the native capture implementation.

## Behavior and troubleshooting

Supported Ionic controls can render natively on iOS 26+. Android standard controls keep their Web presentation; app-local Compose extensions are a separate capability. Unsupported controls also retain Web presentation. Styling the page with the theme does not imply every control becomes native.

- **Imports cannot resolve:** check that `@webview-native-ui/cordova-plugin` is installed in the npm project that builds your Web assets; a separate Web project needs its own npm install of the same version. Source-only Git installation does not contain generated assets.
- **Native UI stays in Web mode on supported iOS:** check that `cordova.js` is loaded, startup waits for `deviceready`, and the native app was rebuilt after plugin installation. Inspect `handle.getStatus()`.
- **Native controls are offset:** check page safe-area spacing; the adapter disables automatic scroll-view insets to keep CSS and native coordinates aligned.

Local comparisons covered Ionic 8.8.19 on iOS 27.2 and Android API 35: controls, tabs, overlays, theme integration, dark mode and stop/restart. Search used the theme's Web fallback on both hosts. These checks do not establish native-search parity, complete framework-router transitions or interactive back gestures.

## Local development and archive verification

To build a local distribution archive from this repository, run:

```sh
npm ci
npm run fetch:core
npm run build
npm test
npm run test:package
npm pack
```

Extract the archive into a temporary directory, then install its `package` directory with `cordova plugin add /absolute/path/to/package`. This exercises the shipped files without requiring Core's development dependencies. A developer checkout can also be installed with `cordova plugin add /absolute/path/to/cordova-plugin` after the fetch and build steps above. Direct Git URL installation is not supported; install the prepared archive instead.

For a bundled application, also install the same archive into the npm project that builds your Web assets:

```sh
# Run in the Web application's npm project; use the archive produced above.
npm install /absolute/path/to/webview-native-ui-cordova-plugin-0.1.6.tgz
```

Use the same archive for the Cordova plugin and Web bundler so their versions match.

## Shared source and updates

Thin Cordova adapter for the shared Native UI implementation in [capacitor-plugin](https://github.com/webview-native-ui/capacitor-plugin). Capacitor remains the primary implementation. This package adds Cordova callbacks, event subscriptions, installation metadata and lifecycle cleanup; it does not fork the renderers.

The shared implementation is pinned to the Core commit included in Capacitor plugin **2.1.11**, with Engine **1.0.11** fixed across JavaScript, SwiftPM and Android Maven. This includes native and Web rail toolbar button badges, current layout handling, iOS momentum cancellation and snapshot acquisition order. The exact Core commit is recorded in `core-source.json` and the packaged `shared/ORIGIN.json`.

The initial version deliberately uses generated copies. The Core repository and commit are pinned in `core-source.json`. CI runs `npm run fetch:core` to clone that commit into `.upstream/`, then `npm run build` compiles its TypeScript and copies its Swift/Kotlin unchanged into `shared/`. The prepared npm archive is uploaded as the `cordova-native-ui` CI artifact. Capacitor is not a runtime dependency, and consumers do not clone or build Core. `shared/ORIGIN.json` records the Core repository and commit. Only `src/` contains Cordova-owned implementation. Do not edit generated `shared/`, `dist/` or `www/` files. Builds reject local modifications or extra files in the copied Core source directories and upstream LICENSE, including ignored files. Commit Core changes upstream and update the pinned SHA before distributing them. Changes outside those inputs, such as generated upstream documentation, do not block the build.

Directly depending on the Capacitor repository's Core SPM product conflicts with cordova-ios because its dependency graph also contains capacitor-swift-pm's `Cordova` target. The local Core target avoids that graph collision while preserving one upstream editing source. This repository is installed through Cordova, not directly as a GitHub Swift Package: its shared Swift assets are generated by the build.

To update Core, change the pinned Git commit in `core-source.json`, run `npm run fetch:core`, then `npm run build`, `npm test`, `npm run test:package` and both native checks. All three Core languages use the same upstream commit; native archive checks compare the copies byte-for-byte. Publishing a new Cordova package is required to distribute a Core update. If this becomes costly, move Core into an independently versioned package rather than adding manual patches here.

## Validation

```sh
npm run lint
npm test
npm run test:package
node scripts/verify-native.mjs ios
node scripts/verify-native.mjs android
```

Native checks install an actual npm archive into a temporary Cordova application and build it. Android uses `gradle` from PATH, or the explicit `NATIVE_UI_GRADLE` executable. The fixture exercises configuration, callbacks, listener disposal, invalid listener requests and a full WebView reload; it reports `NATIVE_UI_SMOKE_OK` when launched. CI builds both platform consumers; it does not launch the fixture or automate simulator/emulator operations. `npm run test:package` additionally checks the adapter exports and TypeScript imports from the packed archive and verifies that it excludes the theme. Shared renderer tests remain upstream; this package tests the adapter boundary and distribution paths.

## Releases

`ci.yml` validates pull requests and main (JavaScript/package checks and iOS/Android builds). It does not publish to npm. `release.yml` publishes stable GitHub Releases through npm Trusted Publishing; draft and prerelease releases do not publish.

For the next release, update `package.json`, `package-lock.json` and the root plugin version in `plugin.xml` together. Merge the change and wait for main CI to pass, then create a tag such as `v0.1.6` on that commit and publish its GitHub Release. The workflow requires the tag to match all package versions, rebuilds Core and the adapter, runs JavaScript/package checks and publishes the generated archive. Native builds are covered by main CI; the release workflow does not rerun them. Published versions cannot be reused.

The npm Trusted Publisher must specify GitHub organization `webview-native-ui`, repository `cordova-plugin`, and workflow filename `release.yml` (without the directory). Enable direct `npm publish` permission for this workflow. No GitHub environment is configured, so leave the optional environment field empty. Authentication uses `id-token: write`; no npm token secret is needed. Creating the workflow does not publish an existing version automatically.
