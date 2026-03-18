import SwiftUI

// MARK: - Light Color
struct LightColor: Identifiable, Equatable {
    let id = UUID()
    let name: String
    let color: Color
    let rfCode: UInt8  // Código RF para enviar al controlador hardware

    static let palette: [LightColor] = [
        LightColor(name: "Blanco",    color: .white,                          rfCode: 0x00),
        LightColor(name: "Rojo",      color: Color(red: 1,   green: 0,   blue: 0),   rfCode: 0x01),
        LightColor(name: "Verde",     color: Color(red: 0,   green: 1,   blue: 0),   rfCode: 0x02),
        LightColor(name: "Azul",      color: Color(red: 0,   green: 0.4, blue: 1),   rfCode: 0x03),
        LightColor(name: "Amarillo",  color: Color(red: 1,   green: 0.9, blue: 0),   rfCode: 0x04),
        LightColor(name: "Cian",      color: Color(red: 0,   green: 1,   blue: 1),   rfCode: 0x05),
        LightColor(name: "Magenta",   color: Color(red: 1,   green: 0,   blue: 1),   rfCode: 0x06),
        LightColor(name: "Naranja",   color: Color(red: 1,   green: 0.5, blue: 0),   rfCode: 0x07),
        LightColor(name: "Rosa",      color: Color(red: 1,   green: 0.4, blue: 0.7), rfCode: 0x08),
        LightColor(name: "Lavanda",   color: Color(red: 0.7, green: 0.5, blue: 1),   rfCode: 0x09),
        LightColor(name: "Turquesa",  color: Color(red: 0,   green: 0.8, blue: 0.6), rfCode: 0x0A),
        LightColor(name: "Blanco Cálido", color: Color(red: 1, green: 0.85, blue: 0.6), rfCode: 0x0B),
    ]
}

// MARK: - Light Effect
enum LightEffect: String, CaseIterable, Identifiable {
    case staticColor = "Estático"
    case flash       = "Flash"
    case strobe      = "Estroboscópico"
    case fade        = "Fundido"
    case smooth      = "Transición suave"
    case jump3       = "Salto 3 colores"
    case jump7       = "Salto 7 colores"
    case fade3       = "Fundido 3 colores"
    case fade7       = "Fundido 7 colores"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .staticColor: return "lightbulb.fill"
        case .flash:       return "bolt.fill"
        case .strobe:      return "camera.flash.on"
        case .fade:        return "sun.max.fill"
        case .smooth:      return "waveform"
        case .jump3:       return "arrow.triangle.branch"
        case .jump7:       return "arrow.triangle.merge"
        case .fade3:       return "drop.fill"
        case .fade7:       return "sparkles"
        }
    }

    var rfCode: UInt8 {
        switch self {
        case .staticColor: return 0x20
        case .flash:       return 0x21
        case .strobe:      return 0x22
        case .fade:        return 0x23
        case .smooth:      return 0x24
        case .jump3:       return 0x25
        case .jump7:       return 0x26
        case .fade3:       return 0x27
        case .fade7:       return 0x28
        }
    }
}

// MARK: - Light State
class LightState: ObservableObject {
    @Published var isOn: Bool = false
    @Published var brightness: Double = 0.8       // 0.0 – 1.0
    @Published var selectedColor: LightColor = LightColor.palette[0]
    @Published var selectedEffect: LightEffect = .staticColor
    @Published var effectSpeed: Double = 0.5      // 0.0 – 1.0

    /// Color de la habitación simulado (mezcla color + brillo)
    var roomColor: Color {
        guard isOn else { return .black }
        return selectedColor.color.opacity(brightness)
    }

    /// Porcentaje de brillo como string
    var brightnessLabel: String {
        "\(Int(brightness * 100))%"
    }

    /// Porcentaje de velocidad como string
    var speedLabel: String {
        "\(Int(effectSpeed * 100))%"
    }
}
