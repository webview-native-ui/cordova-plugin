import XCTest
final class IonicParityTests: XCTestCase {
    func testCapacitor() { verify("dev.rdlabo.nativeui.parity.capacitor") }
    func testCordova() { verify("dev.rdlabo.nativeuitest") }
    private func capture(_ app: XCUIApplication, _ name: String) {
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = name; shot.lifetime = .keepAlways; add(shot)
    }
    private func verify(_ bundle: String) {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: bundle)
        app.launch(); defer { app.terminate() }
        XCTAssertTrue(app.webViews.staticTexts["Ready"].waitForExistence(timeout: 20), app.debugDescription)
        XCTAssertTrue(app.webViews.staticTexts["Theme integration: true"].exists, app.debugDescription)
        let nativeAdd = app.buttons.matching(NSPredicate(format: "label == %@ AND identifier BEGINSWITH %@", "Add", "native-ui-")).firstMatch
        XCTAssertTrue(nativeAdd.waitForExistence(timeout: 10), app.debugDescription)
        capture(app, "\(bundle)-ionic-light")
        nativeAdd.tap()
        XCTAssertTrue(app.webViews.staticTexts["Count: 1"].waitForExistence(timeout: 5))
        app.buttons["Two"].firstMatch.tap()
        XCTAssertTrue(app.webViews.staticTexts["Segment: two"].waitForExistence(timeout: 5))
        app.buttons["Settings"].firstMatch.tap()
        XCTAssertTrue(app.webViews.staticTexts["Settings content"].waitForExistence(timeout: 5))
        app.buttons["Home"].firstMatch.tap()
        XCTAssertTrue(nativeAdd.waitForExistence(timeout: 8))
        app.webViews.buttons["Transition handshake"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Transition: passed"].waitForExistence(timeout: 5))
        XCTAssertTrue(nativeAdd.waitForExistence(timeout: 5))
        for label in ["Open modal", "Open popover"] {
            app.webViews.buttons[label].tap()
            let close = app.webViews.buttons["Close overlay"]
            XCTAssertTrue(close.waitForExistence(timeout: 8), app.debugDescription)
            XCTAssertFalse(nativeAdd.exists, "Background native Add must retire while an Ionic overlay is open")
            capture(app, "\(bundle)-\(label)")
            close.tap()
            XCTAssertTrue(app.webViews.staticTexts["Overlay dismissed"].waitForExistence(timeout: 5))
            XCTAssertTrue(nativeAdd.waitForExistence(timeout: 8), app.debugDescription)
        }
        app.webViews.buttons["Toggle dark"].tap()
        capture(app, "\(bundle)-ionic-dark")
        nativeAdd.tap()
        XCTAssertTrue(app.webViews.staticTexts["Count: 2"].waitForExistence(timeout: 5))
        app.webViews.buttons["Stop native UI"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Stopped"].waitForExistence(timeout: 5))
        XCTAssertFalse(nativeAdd.exists)
        app.webViews.buttons["Add"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Count: 3"].waitForExistence(timeout: 5))
        app.webViews.buttons["Restart native UI"].tap()
        XCTAssertTrue(nativeAdd.waitForExistence(timeout: 8))
        app.buttons.matching(NSPredicate(format: "label == %@", "Search")).firstMatch.tap()
        let field = app.searchFields.firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 8), app.debugDescription)
        field.tap()
        field.typeText("apple")
        XCTAssertTrue(app.webViews.staticTexts["Query: apple"].waitForExistence(timeout: 5), app.debugDescription)
        capture(app, "\(bundle)-search")
        // This device/layout uses the theme's Web search fallback in both hosts.
        XCTAssertTrue(app.webViews.searchFields.firstMatch.exists)
        if app.toolbars.buttons["Done"].firstMatch.exists { app.toolbars.buttons["Done"].firstMatch.tap() }
        let close = app.webViews.buttons["Close search"].firstMatch
        XCTAssertTrue(close.waitForExistence(timeout: 5), app.debugDescription)
        close.tap()
        XCTAssertTrue(app.webViews.staticTexts["Query: apple"].waitForExistence(timeout: 5))
        XCTAssertTrue(nativeAdd.waitForExistence(timeout: 8), app.debugDescription)
        capture(app, "\(bundle)-restarted")
    }
}
