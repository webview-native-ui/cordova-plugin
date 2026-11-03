import Cordova
@_exported import NativeUICore
import WebKit

@objc(CDVNativeUI)
public final class CordovaNativeUIPlugin: CDVPlugin {
    private var renderer: NativeUIController?
    private var originalInsetBehavior: UIScrollView.ContentInsetAdjustmentBehavior?
    private var listeners: [String: (event: String, callback: String)] = [:]
    private let events: Set<String> = ["activate", "search", "webViewMetricsChange", "overlay", "snapshotInteraction"]

    private func core() -> NativeUIController {
        if let renderer { return renderer }
        let renderer = NativeUIController(environment: NativeUIEnvironment(
            webView: { [weak self] in self?.webView as? WKWebView },
            viewController: { [weak self] in self?.viewController },
            emit: { [weak self] event, data in self?.emit(event, data: data) },
            hasListeners: { [weak self] event in self?.listeners.values.contains { $0.event == event } ?? false },
            trigger: { [weak self] name, data in
                guard let encoded = try? JSONEncoder().encode(name), let quoted = String(data: encoded, encoding: .utf8) else { return }
                self?.commandDelegate.evalJs("window.dispatchEvent(Object.assign(new Event(\(quoted)), \(data ?? "{}")));")
            }
        ))
        self.renderer = renderer
        renderer.load()
        return renderer
    }
    public override func pluginInitialize() {
        // Core projects CSS viewport coordinates into the full WKWebView bounds,
        // matching Capacitor's default. Automatic safe-area insets distort that mapping.
        if let webView = webView as? WKWebView {
            originalInsetBehavior = webView.scrollView.contentInsetAdjustmentBehavior
            webView.scrollView.contentInsetAdjustmentBehavior = .never
        }
        _ = core()
    }
    private func emit(_ event: String, data: [String: Any]) {
        for listener in listeners.values where listener.event == event {
            let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: ["type": "event", "data": data])
            result.setKeepCallbackAs(true)
            commandDelegate.send(result, callbackId: listener.callback)
        }
    }
    private func request(_ command: CDVInvokedUrlCommand) -> NativeUICall {
        NativeUICall(options: command.arguments.first as? [String: Any] ?? [:],
            resolve: { [weak self] data in
                self?.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_OK, messageAs: data), callbackId: command.callbackId)
            }, reject: { [weak self] message in
                self?.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: message), callbackId: command.callbackId)
            })
    }
    @objc public func addListener(_ command: CDVInvokedUrlCommand) {
        let call = request(command)
        guard let id = call.getString("id"), let event = call.getString("eventName"),
              events.contains(event), listeners[id] == nil else { call.reject("Invalid or duplicate listener"); return }
        listeners[id] = (event, command.callbackId)
        let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: ["type": "ready"])
        result.setKeepCallbackAs(true)
        commandDelegate.send(result, callbackId: command.callbackId)
    }
    @objc public func removeListener(_ command: CDVInvokedUrlCommand) {
        let call = request(command)
        if let id = call.getString("id"), let listener = listeners.removeValue(forKey: id) {
            commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_NO_RESULT), callbackId: listener.callback)
        }
        call.resolve()
    }
    private func reset() {
        for listener in listeners.values {
            commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_NO_RESULT), callbackId: listener.callback)
        }
        listeners.removeAll()
        guard let previous = renderer else { return }
        renderer = nil
        previous.stopOverlays(NativeUICall(options: [:], resolve: { _ in }, reject: { _ in }))
        previous.clear(NativeUICall(options: ["revision": Int.max], resolve: { _ in _ = previous }, reject: { _ in }))
    }
    public override func onReset() { reset(); super.onReset() }
    public override func dispose() {
        reset()
        if let originalInsetBehavior, let webView = webView as? WKWebView {
            webView.scrollView.contentInsetAdjustmentBehavior = originalInsetBehavior
        }
        super.dispose()
    }
    @objc public func configure(_ command: CDVInvokedUrlCommand) { core().configure(request(command)) }
    @objc public func coveredSnapshot(_ command: CDVInvokedUrlCommand) { core().coveredSnapshot(request(command)) }
    @objc public func completeExtensionAction(_ command: CDVInvokedUrlCommand) { core().completeExtensionAction(request(command)) }
    @objc public func getWebViewMetrics(_ command: CDVInvokedUrlCommand) { core().getWebViewMetrics(request(command)) }
    @objc public func getVerticalBarsGeometry(_ command: CDVInvokedUrlCommand) { core().getVerticalBarsGeometry(request(command)) }
    @objc public func prepareOverlay(_ command: CDVInvokedUrlCommand) { core().prepareOverlay(request(command)) }
    @objc public func presentOverlay(_ command: CDVInvokedUrlCommand) { core().presentOverlay(request(command)) }
    @objc public func getConnectionState(_ command: CDVInvokedUrlCommand) { core().getConnectionState(request(command)) }
    @objc public func dismissOverlay(_ command: CDVInvokedUrlCommand) { core().dismissOverlay(request(command)) }
    @objc public func closeOverlay(_ command: CDVInvokedUrlCommand) { core().closeOverlay(request(command)) }
    @objc public func stopOverlays(_ command: CDVInvokedUrlCommand) { core().stopOverlays(request(command)) }
    @objc public func update(_ command: CDVInvokedUrlCommand) { core().update(request(command)) }
    @objc public func setToolbarTransitionProgress(_ command: CDVInvokedUrlCommand) { core().setToolbarTransitionProgress(request(command)) }
    @objc public func clear(_ command: CDVInvokedUrlCommand) { core().clear(request(command)) }
}
