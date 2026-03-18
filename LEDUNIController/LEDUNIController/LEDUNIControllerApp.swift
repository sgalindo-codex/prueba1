import SwiftUI

@main
struct LEDUNIControllerApp: App {
    @StateObject private var lightState = LightState()
    @StateObject private var rfService = RFControlService.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(lightState)
                .environmentObject(rfService)
                .preferredColorScheme(.dark)
        }
    }
}
