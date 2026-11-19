# Cordova Native UI

Render supported HTML and Ionic controls natively on iOS, or use Android Dynamic Color in your Cordova app. [Install the plugin](https://webview-native-ui.com/projects/cordova-native-ui/docs/readme#install-the-same-version-in-both-projects). For native controls, [start Native UI](https://webview-native-ui.com/projects/cordova-native-ui/docs/readme#start-after-cordova-is-ready) after Cordova and your Web app are ready. To read the Android palette on its own, use the [Android Dynamic Color API](#android-dynamic-color) after device readiness.

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
cordova plugin add @webview-native-ui/cordova-plugin@0.1.7
```

This installs the prepared native and JavaScript assets and saves the npm dependency in the Cordova project. You do not need to clone this repository, fetch Core or build the plugin. Direct Git URL installation is not supported because generated assets are not committed.

If your Web bundler uses a separate npm project, install the same version there as well:

```sh
npm install @webview-native-ui/cordova-plugin@0.1.7
```

When the Cordova app and bundler share a `package.json`, the dependency saved by `cordova plugin add` is sufficient. Keep `<script src="cordova.js"></script>` in your Cordova entry HTML, build your Web assets into the application's `www` directory, then run `cordova prepare` and rebuild the native app. Reloading Web assets alone does not update native code.

## Start Native UI

Cordova loads `window.NativeUI` from the bundled JavaScript module. For a page whose controls are already in the DOM, start after `deviceready`:

```js
document.addEventListener('deviceready', async () => {
  const handle = await window.NativeUI.enableNativeUI();
  // Call await handle.destroy() when your application permanently stops using it.
});
```

For a framework app, wait for both `deviceready` and the first app mount before starting Native UI. Register the device-ready listener during startup and start the runtime once per app.

Bundled applications can import `enableNativeUI` from `@webview-native-ui/cordova-plugin/core` (standard HTML), or the package root (Ionic integration). Use one entry style in an application. The `/integration` and `/vertical-bars` subpaths mirror the shared APIs. The browser bundle includes its JavaScript dependencies; npm ESM imports use the declared runtime dependencies. No Capacitor JavaScript runtime is required.

App-local Swift renderers use `import CordovaNativeUI` and `NativeUI.register(...)`. Android renderers retain the shared `dev.rdlabo.capacitor.nativeui.NativeUI` namespace for compatibility; this name does not imply an Android Capacitor SDK dependency. See the [shared extension documentation](https://webview-native-ui.com/projects/capacitor-native-ui/docs/native-ui-extensions) for renderer contracts.

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

## Contributing

- <a id="local-development-and-archive-verification"></a>[Local development and archive verification](CONTRIBUTING.md#local-development-and-archive-verification)
- <a id="shared-source-and-updates"></a>[Shared source and updates](CONTRIBUTING.md#shared-source-and-updates)
- <a id="validation"></a>[Validation](CONTRIBUTING.md#validation)
- <a id="releases"></a>[Releases](CONTRIBUTING.md#releases)
