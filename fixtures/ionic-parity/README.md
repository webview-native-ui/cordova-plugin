# Ionic iOS27 theme runtime comparison

This fixture uses published `@rdlabo/ionic-theme-ios27@2.1.0` and `@ionic/core@8.8.19` in iOS mode on both hosts. Shared Core is pinned by `core-source.json`. It exercises Ionic web components directly, without an Angular/React/Vue router.

## Consumer setup

The Cordova fixture installs the actual packed `@webview-ui-native/cordova-plugin` archive in an isolated consumer. It imports theme helpers from `/theme` and styles from `/theme/css/*`. It has **no bundler aliases** and does not install the original theme or Capacitor plugin. The build asserts that only one integration module is included and that no Capacitor runtime enters the bundle.

The plugin copies the pinned theme's JS, declarations and CSS at build time and rewrites its integration imports to the copied Core. Users do not perform this rewrite or configure aliases.

## Prepare

From the Cordova repository root, after the normal Core fetch/build:

```sh
npm ci --prefix .upstream
npm run build --prefix .upstream
node scripts/prepare-ionic-parity.mjs
```

Generated variants are `artifacts/ionic-parity/{capacitor,cordova}/www`.
The stylesheet uses paired Ionic/theme class-based dark palettes. Icon registration is shared between Ionic and the fixture.

For a new Cordova consumer:

```sh
NATIVE_UI_FIXTURE=artifacts/ionic-parity/cordova/www node scripts/verify-native.mjs ios
NATIVE_UI_FIXTURE=artifacts/ionic-parity/cordova/www node scripts/verify-native.mjs android
```

Use the existing comparison Capacitor project from `../ios-parity/README.md`; replace its `www` contents with the Capacitor variant and run `npx cap sync`, then rebuild. Install both apps before running tests. Bundle IDs remain `dev.rdlabo.nativeuitest` and `dev.rdlabo.nativeui.parity.capacitor`.

## iOS real UI operations

```sh
xcodegen generate --spec artifacts/ionic-parity/tests/project.yml
xcodebuild -project artifacts/ionic-parity/tests/IonicParityTests.xcodeproj \
  -scheme IonicParityTests \
  -destination 'platform=iOS Simulator,id=YOUR_SIMULATOR_ID' \
  -derivedDataPath artifacts/ionic-parity/TestDerived \
  -resultBundlePath artifacts/ionic-parity/results.xcresult test
```

The tests require a genuine native Add button, verify counter and segment events and actual Settings/Home tab changes, assert background native controls disappear during modal/popover presentation and return afterward, exercise dark mode, stop/restart, and search text propagation. Screenshots are retained in the result bundle. On the tested iPhone Duo/iOS 27.2 layout, search used the theme Web fallback in both hosts; the tests do not establish UIKit native-search parity.

## Android Web fallback

Start the app, identify its PID and forward the debuggable WebView socket:

```sh
adb forward tcp:9223 localabstract:webview_devtools_remote_PID
node scripts/verify-ionic-android.mjs 9223 cordova
```

Repeat for Capacitor with its PID and `capacitor` as the final argument. Tests use pointer events and keyboard input via CDP, not direct invocation of handlers. Generated reports include the theme CSS value, runtime connection state and checked behaviors.

Android standard Ionic controls intentionally remain Web-rendered in both hosts. These checks do not cover custom Compose extensions, an Angular router, interactive back gestures, every overlay variant, or every OS/device. The transition check verifies the integration suspension/resumption contract; it is not a complete navigation animation test.
