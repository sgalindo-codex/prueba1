import Foundation
import Combine

// MARK: - RF Control Service
/// Servicio de control RF para luces LEDUNI.
///
/// Estado actual: SIMULACIÓN (modo demo).
///
/// Para conectar hardware real (ESP32 + módulo RF 433/315 MHz):
///   1. Flashea el firmware incluido en /Hardware/esp32_rf_bridge/
///   2. Cambia `simulationMode = false`
///   3. Configura `controllerIP` con la IP de tu ESP32 en la red local
///
/// Protocolo de comunicación: HTTP REST sobre WiFi local (sin nube)
///   POST http://<ip>/command
///   Body: { "cmd": <rfCode>, "param": <value> }
class RFControlService: ObservableObject {

    // MARK: - Configuration
    static let shared = RFControlService()

    var simulationMode: Bool = true
    var controllerIP: String = "192.168.1.100"
    var controllerPort: Int = 8080
    private var baseURL: String { "http://\(controllerIP):\(controllerPort)" }

    // MARK: - Published state
    @Published var isConnected: Bool = false
    @Published var lastCommandResult: CommandResult = .idle

    // MARK: - Internal
    private var session: URLSession = .shared
    private var cancellables = Set<AnyCancellable>()

    private init() {
        if simulationMode {
            // En simulación, fingimos conexión inmediata
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                self.isConnected = true
            }
        } else {
            ping()
        }
    }

    // MARK: - Public API

    func sendPower(on: Bool) {
        let code: UInt8 = on ? 0x10 : 0x11
        send(command: Command(cmd: code, param: 0))
    }

    func sendBrightness(_ value: Double) {
        // Mapear 0.0–1.0 a 0–255
        let param = UInt8(clamp(Int(value * 255), min: 0, max: 255))
        send(command: Command(cmd: 0x12, param: param))
    }

    func sendColor(_ color: LightColor) {
        send(command: Command(cmd: 0x13, param: color.rfCode))
    }

    func sendEffect(_ effect: LightEffect) {
        send(command: Command(cmd: 0x14, param: effect.rfCode))
    }

    func sendEffectSpeed(_ value: Double) {
        let param = UInt8(clamp(Int(value * 255), min: 0, max: 255))
        send(command: Command(cmd: 0x15, param: param))
    }

    // MARK: - Private

    private func send(command: Command) {
        guard !simulationMode else {
            // Modo demo: simular latencia de red
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                self.lastCommandResult = .success(command)
                print("[RFControlService] [SIMULADO] CMD=\(String(format: "0x%02X", command.cmd)) PARAM=\(String(format: "0x%02X", command.param))")
            }
            return
        }

        guard let url = URL(string: "\(baseURL)/command") else { return }

        var request = URLRequest(url: url, timeoutInterval: 3)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            request.httpBody = try JSONEncoder().encode(command)
        } catch {
            lastCommandResult = .failure("Error al codificar comando: \(error.localizedDescription)")
            return
        }

        session.dataTaskPublisher(for: request)
            .map { _ in CommandResult.success(command) }
            .catch { error in Just(CommandResult.failure(error.localizedDescription)) }
            .receive(on: DispatchQueue.main)
            .sink { [weak self] result in
                self?.lastCommandResult = result
            }
            .store(in: &cancellables)
    }

    func ping() {
        guard !simulationMode else { return }
        guard let url = URL(string: "\(baseURL)/ping") else { return }

        session.dataTaskPublisher(for: url)
            .map { _ in true }
            .catch { _ in Just(false) }
            .receive(on: DispatchQueue.main)
            .sink { [weak self] connected in
                self?.isConnected = connected
            }
            .store(in: &cancellables)
    }

    private func clamp(_ value: Int, min: Int, max: Int) -> Int {
        Swift.max(min, Swift.min(max, value))
    }
}

// MARK: - Supporting Types

struct Command: Codable {
    let cmd: UInt8
    let param: UInt8
}

enum CommandResult: Equatable {
    case idle
    case success(Command)
    case failure(String)
}
