// swift-tools-version: 5.9
import PackageDescription
let package = Package(
    name: "cordova-plugin-native-ui",
    platforms: [.iOS(.v15)],
    products: [.library(name: "cordova-plugin-native-ui", targets: ["CordovaNativeUI"])],
    dependencies: [
        .package(url: "https://github.com/apache/cordova-ios.git", branch: "master"),
        .package(url: "https://github.com/webview-native-ui/engine.git", from: "1.0.0")
    ],
    targets: [
        .target(name: "NativeUICore", dependencies: [
            .product(name: "WebViewNativeUIEngine", package: "engine")
        ], path: "shared/ios"),
        .target(name: "CordovaNativeUI", dependencies: [
            .product(name: "Cordova", package: "cordova-ios"), "NativeUICore"
        ], path: "src/ios")
    ]
)
