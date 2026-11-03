# Capacitor / Cordova behavior comparison

Both apps use `examples/native-ui-html` from the commit in `core-source.json`.
The Cordova variant changes only the import and waits for `deviceready`.
Generated applications, projects, screenshots and test results stay under ignored
`artifacts/parity/`; `verify-native.mjs` prints its temporary Cordova app directory.

From the repository root:

```sh
npm ci
npm run fetch:core
npm run build
node scripts/prepare-parity.mjs
NATIVE_UI_FIXTURE=artifacts/parity/www node scripts/verify-native.mjs ios
NATIVE_UI_FIXTURE=artifacts/parity/www node scripts/verify-native.mjs android
```

The Android build requires the same SDK/JDK/Gradle environment as the normal native
check. Set `NATIVE_UI_GRADLE` when `gradle` is not on PATH.
Install the resulting `NativeUITest.app` / `app-debug.apk` on the test device.
The app bundle ID is `dev.rdlabo.nativeuitest`.

Build the comparison Capacitor app from the same upstream source:

```sh
npm ci --prefix .upstream
npm run build --prefix .upstream
npm install --prefix artifacts/parity/capacitor
npm run build --prefix artifacts/parity/capacitor
cd artifacts/parity/capacitor
npx cap add ios
npx cap add android
```

Build `ios/App/App.xcodeproj` (scheme `App`) and `android` (`assembleDebug`), then
install both. For later rebuilds use `npx cap sync` instead of `cap add`.
The comparison bundle ID is `dev.rdlabo.nativeui.parity.capacitor`.
No existing Capacitor demo is replaced.

## iOS

From the repository root, with both apps installed on an iOS 26+ simulator:

```sh
xcodegen generate --spec artifacts/parity/tests/project.yml
xcodebuild -project artifacts/parity/tests/NativeUIParityTests.xcodeproj \
  -scheme NativeUIParityTests \
  -destination 'platform=iOS Simulator,id=YOUR_SIMULATOR_ID' \
  -derivedDataPath artifacts/parity/TestDerived \
  -resultBundlePath artifacts/parity/comparison.xcresult test
```

Choose a new result bundle path for each run. Both tests require genuine native
Add/Back accessibility identifiers, check their original HTML handlers, navigate
home/details, stop and restore Web controls, restart in rail mode, then stop again.
Screenshots are retained as XCTest attachments.

## Android

Standard controls remain Web controls on Android in both hosts; this fixture does
not register app-local Compose extensions. Start the app and forward its debug
WebView socket (find its PID using `adb shell pidof BUNDLE_ID`):

```sh
adb forward tcp:9223 localabstract:webview_devtools_remote_PID
node scripts/verify-android-parity.mjs 9223 cordova
```

Repeat for the Capacitor bundle and use `capacitor` as the final argument. The test
sends pointer events through the WebView debugger, checks Add/details/Back, stop
and restoration, rail proxy forwarding, and reload/restart. Screenshots are saved
under `artifacts/parity/`.

This is behavioral coverage of the plain HTML sample. It does not establish full
Ionic overlays/search/popovers or custom native extension parity.
