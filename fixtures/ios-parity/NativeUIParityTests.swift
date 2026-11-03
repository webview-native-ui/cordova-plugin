import XCTest

final class NativeUIParityTests: XCTestCase {
    func testCapacitor() { verifyControls("dev.rdlabo.nativeui.parity.capacitor") }
    func testCordova() { verifyControls("dev.rdlabo.nativeuitest") }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func verifyControls(_ bundle: String) {
        let app = XCUIApplication(bundleIdentifier: bundle)
        app.launch()
        defer { app.terminate() }
        let add = app.buttons.matching(NSPredicate(format: "label == %@ AND identifier BEGINSWITH %@", "Add", "native-ui-")).firstMatch
        XCTAssertTrue(add.waitForExistence(timeout: 20), app.debugDescription)
        let home = app.webViews.staticTexts["Home"]
        XCTAssertLessThanOrEqual(add.frame.maxY, home.frame.minY, "Native Add overlaps the following HTML heading")
        capture(app, "\(bundle)-native")
        add.tap()
        XCTAssertTrue(app.webViews.staticTexts["Count: 1"].waitForExistence(timeout: 5), app.debugDescription)
        app.webViews.buttons["Open details"].tap()
        let back = app.buttons.matching(NSPredicate(format: "label == %@ AND identifier BEGINSWITH %@", "Back", "native-ui-")).firstMatch
        XCTAssertTrue(back.waitForExistence(timeout: 5), app.debugDescription)
        capture(app, "\(bundle)-details")
        back.tap()
        XCTAssertTrue(app.webViews.staticTexts["Home"].waitForExistence(timeout: 5))
        app.webViews.buttons["Stop native UI"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Stopped"].waitForExistence(timeout: 5))
        XCTAssertFalse(add.exists)
        app.webViews.buttons["Add"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Count: 2"].waitForExistence(timeout: 5))
        capture(app, "\(bundle)-web-restored")
        app.webViews.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Use the application's rail")).firstMatch.tap()
        XCTAssertTrue(app.webViews.staticTexts["Ready"].waitForExistence(timeout: 5))
        app.buttons.matching(NSPredicate(format: "label == %@", "Add")).firstMatch.tap()
        XCTAssertTrue(app.webViews.staticTexts["Count: 3"].waitForExistence(timeout: 5))
        capture(app, "\(bundle)-rail")
        app.webViews.buttons["Stop native UI"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Stopped"].waitForExistence(timeout: 5))
        app.webViews.buttons["Add"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Count: 4"].waitForExistence(timeout: 5))
    }
}
