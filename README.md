# Cordova Native UI

Thin Cordova adapter for the shared Native UI implementation in [capacitor-plugin](https://github.com/webview-native-ui/capacitor-plugin). Capacitor remains the primary implementation. This package adds Cordova callbacks, event subscriptions, installation metadata and lifecycle cleanup; it does not fork the renderers.

## Requirements

- Cordova CLI 13, cordova-ios 8.1+ with Swift Package Manager, or cordova-android 15+.
- iOS native rendering requires iOS 26+ and Xcode 26+; older iOS uses the shared Web fallback. CocoaPods and older Cordova versions are not supported in this initial adapter.
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

## Local installation

This initial package has not been published. In this repository, run:

```sh
npm ci
npm run fetch:core
npm run build
npm test
npm run test:package
npm pack
```

Extract the archive into a temporary directory, then install its `package` directory with `cordova plugin add /absolute/path/to/package`. This exercises the shipped files without requiring Core's development dependencies. A developer checkout can also be installed with `cordova plugin add /absolute/path/to/cordova-plugin` after the fetch and build steps above. Direct Git URL installation is not supported; install the prepared archive instead.

Cordova loads `window.NativeUI` from the bundled JavaScript module. Start after `deviceready`:

```js
document.addEventListener('deviceready', async () => {
  const handle = await window.NativeUI.enableNativeUI();
  // Call await handle.destroy() when your application permanently stops using it.
});
```

Bundled applications can import `enableNativeUI` from `@webview-ui-native/cordova-plugin/core` (standard HTML), or the package root (Ionic integration). Use one entry style in an application. The `/integration` and `/vertical-bars` subpaths mirror the shared APIs. The browser bundle includes its JavaScript dependencies; npm ESM imports use the declared Engine/theme-utils dependencies. No Capacitor JavaScript runtime is required.

App-local Swift renderers use `import CordovaNativeUI` and `NativeUI.register(...)`. Android renderers retain the shared `dev.rdlabo.capacitor.nativeui.NativeUI` namespace for compatibility; this name does not imply an Android Capacitor SDK dependency. See the [shared extension documentation](https://github.com/webview-native-ui/capacitor-plugin/blob/main/docs/native-ui-extensions.md) for renderer contracts.

On iOS, the adapter uses the same full-WebView coordinate space as Capacitor
(`contentInsetAdjustmentBehavior = .never`). Apply safe-area spacing in your page
CSS, for example with `env(safe-area-inset-top)`, rather than relying on automatic
scroll-view insets.

## Ionic iOS27 theme integration

The plugin includes a Cordova-ready copy of the iOS27 theme. Install this package alongside your existing Ionic dependencies; no separate theme package or bundler alias is required.

```ts
import { enableNativeUI } from '@webview-ui-native/cordova-plugin';
import {
  iosTransitionAnimation,
  popoverEnterAnimation,
  popoverLeaveAnimation,
  attachTabBarSearchable,
} from '@webview-ui-native/cordova-plugin/theme';
```

Keep Ionic's base CSS, then load the matching theme styles:

```css
@import '@ionic/core/css/palettes/dark.system.css';
@import '@webview-ui-native/cordova-plugin/theme/css/default-variables.css';
@import '@webview-ui-native/cordova-plugin/theme/css/ionic-theme-ios27.css';
@import '@webview-ui-native/cordova-plugin/theme/css/md-remove-ios-class-effect.css';
@import '@webview-ui-native/cordova-plugin/theme/css/ionic-theme-ios27-dark-system.css';
```

Configure Ionic with the theme animations before mounting the app, and call `enableNativeUI()` after `deviceready` and `ion-app` mounting. Existing theme users replace their theme JS/CSS imports with the paths above and remove the old integration alias. All theme helpers and styles come from the same pinned version. Native UI and the theme share one integration module automatically.

The theme entry is for bundled applications. Do not mix its npm runtime with a separate `window.NativeUI.enableNativeUI()` runtime.

## Shared source and updates

The initial version deliberately uses generated copies. The Core repository and commit are pinned in `core-source.json`. CI runs `npm run fetch:core` to clone that commit into `.upstream/`, then `npm run build` compiles its TypeScript and copies its Swift/Kotlin unchanged into `shared/`. The prepared npm archive is uploaded as the `cordova-native-ui` CI artifact. Capacitor is not a runtime dependency, and consumers do not clone or build Core. `shared/ORIGIN.json` records the Core commit and theme package version. The theme JS, declarations and CSS are copied from its pinned npm build, with only integration imports redirected to the local Core. Its license is included. Only `src/` contains Cordova-owned implementation. Do not edit generated `shared/`, `dist/` or `www/` files.

Directly depending on the Capacitor repository's Core SPM product conflicts with cordova-ios because its dependency graph also contains capacitor-swift-pm's `Cordova` target. The local Core target avoids that graph collision while preserving one upstream editing source. This repository is installed through Cordova, not directly as a GitHub Swift Package: its shared Swift assets are generated by the build.

To update Core, change the pinned Git commit in `core-source.json`, run `npm run fetch:core`, then `npm run build`, `npm test`, `npm run test:package` and both native checks. The theme build input is separately pinned in `devDependencies` and the lockfile. Updating it requires rebuilding and verifying the package; generated theme files are never edited by hand. All three Core languages use the same upstream commit; native archive checks compare the copies byte-for-byte. Publishing a new Cordova package is required to distribute a Core update. If this becomes costly, move Core into an independently versioned package rather than adding manual patches here.

## Validation

```sh
npm run lint
npm test
npm run test:package
node scripts/verify-native.mjs ios
node scripts/verify-native.mjs android
```

Native checks install an actual npm archive into a temporary Cordova application and build it. Android uses `gradle` from PATH, or the explicit `NATIVE_UI_GRADLE` executable. The fixture exercises configuration, callbacks, listener disposal, invalid listener requests and a full WebView reload; it reports `NATIVE_UI_SMOKE_OK` when launched. CI builds both real consumers. Shared renderer tests remain upstream; this package tests the adapter boundary and distribution paths.
