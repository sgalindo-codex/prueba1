import SwiftUI

struct ContentView: View {
    @EnvironmentObject var light: LightState
    @EnvironmentObject var rf: RFControlService

    @State private var showEffects: Bool = false

    var body: some View {
        ZStack {
            // Fondo que simula el color de la habitación
            RoomBackgroundView()

            ScrollView {
                VStack(spacing: 24) {
                    HeaderView()
                    PowerButtonView()
                    BrightnessControlView()
                    ColorPaletteView()
                    EffectSelectorView(showEffects: $showEffects)

                    if showEffects {
                        EffectSpeedView()
                    }

                    ConnectionStatusView()
                        .padding(.bottom, 32)
                }
                .padding(.horizontal, 20)
                .padding(.top, 60)
            }
        }
        .ignoresSafeArea()
    }
}

// MARK: - Room Background
struct RoomBackgroundView: View {
    @EnvironmentObject var light: LightState

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            RadialGradient(
                gradient: Gradient(colors: [
                    light.roomColor,
                    Color.black
                ]),
                center: .top,
                startRadius: 10,
                endRadius: 500
            )
            .ignoresSafeArea()
            .animation(.easeInOut(duration: 0.4), value: light.roomColor)
        }
    }
}

// MARK: - Header
struct HeaderView: View {
    @EnvironmentObject var light: LightState

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: "lightbulb.led.fill")
                .font(.system(size: 40))
                .foregroundColor(light.isOn ? light.selectedColor.color : .gray)
                .shadow(color: light.isOn ? light.selectedColor.color : .clear, radius: 20)
                .animation(.easeInOut(duration: 0.3), value: light.isOn)

            Text("LEDUNI Controller")
                .font(.title2.bold())
                .foregroundColor(.white)

            Text(light.isOn ? "Encendida · \(light.selectedColor.name)" : "Apagada")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding(.bottom, 8)
    }
}

// MARK: - Power Button
struct PowerButtonView: View {
    @EnvironmentObject var light: LightState
    @EnvironmentObject var rf: RFControlService

    var body: some View {
        Button {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                light.isOn.toggle()
            }
            rf.sendPower(on: light.isOn)
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
        } label: {
            ZStack {
                Circle()
                    .fill(light.isOn
                          ? light.selectedColor.color.opacity(0.2)
                          : Color.white.opacity(0.05))
                    .frame(width: 110, height: 110)
                    .overlay(
                        Circle()
                            .stroke(
                                light.isOn ? light.selectedColor.color : Color.gray,
                                lineWidth: 2
                            )
                    )
                    .shadow(color: light.isOn ? light.selectedColor.color.opacity(0.6) : .clear,
                            radius: 20)

                Image(systemName: "power")
                    .font(.system(size: 36, weight: .medium))
                    .foregroundColor(light.isOn ? light.selectedColor.color : .gray)
            }
        }
        .buttonStyle(ScaleButtonStyle())
    }
}

// MARK: - Brightness Control
struct BrightnessControlView: View {
    @EnvironmentObject var light: LightState
    @EnvironmentObject var rf: RFControlService

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "sun.max.fill")
                        .foregroundColor(.yellow)
                    Text("Brillo")
                        .foregroundColor(.white)
                        .fontWeight(.medium)
                    Spacer()
                    Text(light.brightnessLabel)
                        .foregroundColor(.gray)
                        .font(.callout.monospacedDigit())
                }

                Slider(value: $light.brightness, in: 0.05...1.0)
                    .accentColor(light.isOn ? light.selectedColor.color : .gray)
                    .disabled(!light.isOn)
                    .onChange(of: light.brightness) { value in
                        rf.sendBrightness(value)
                    }
            }
        }
        .opacity(light.isOn ? 1 : 0.5)
    }
}

// MARK: - Color Palette
struct ColorPaletteView: View {
    @EnvironmentObject var light: LightState
    @EnvironmentObject var rf: RFControlService

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 10), count: 6)

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Image(systemName: "paintpalette.fill")
                        .foregroundColor(light.selectedColor.color)
                    Text("Color")
                        .foregroundColor(.white)
                        .fontWeight(.medium)
                }

                LazyVGrid(columns: columns, spacing: 10) {
                    ForEach(LightColor.palette) { item in
                        ColorCell(item: item, isSelected: item.id == light.selectedColor.id) {
                            light.selectedColor = item
                            if light.isOn { rf.sendColor(item) }
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        }
                    }
                }
            }
        }
        .opacity(light.isOn ? 1 : 0.5)
        .disabled(!light.isOn)
    }
}

struct ColorCell: View {
    let item: LightColor
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Circle()
                .fill(item.color)
                .frame(width: 42, height: 42)
                .overlay(
                    Circle()
                        .stroke(Color.white, lineWidth: isSelected ? 2.5 : 0)
                )
                .shadow(color: isSelected ? item.color : .clear, radius: 8)
                .scaleEffect(isSelected ? 1.1 : 1.0)
                .animation(.spring(response: 0.25), value: isSelected)
        }
        .buttonStyle(ScaleButtonStyle())
    }
}

// MARK: - Effect Selector
struct EffectSelectorView: View {
    @EnvironmentObject var light: LightState
    @EnvironmentObject var rf: RFControlService
    @Binding var showEffects: Bool

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 14) {
                Button {
                    withAnimation(.easeInOut(duration: 0.25)) {
                        showEffects.toggle()
                    }
                } label: {
                    HStack {
                        Image(systemName: light.selectedEffect.icon)
                            .foregroundColor(.purple)
                        Text("Efecto: \(light.selectedEffect.rawValue)")
                            .foregroundColor(.white)
                            .fontWeight(.medium)
                        Spacer()
                        Image(systemName: showEffects ? "chevron.up" : "chevron.down")
                            .foregroundColor(.gray)
                            .font(.caption)
                    }
                }

                if showEffects {
                    Divider().background(Color.white.opacity(0.1))

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                        ForEach(LightEffect.allCases) { effect in
                            EffectCell(effect: effect, isSelected: effect == light.selectedEffect) {
                                light.selectedEffect = effect
                                if light.isOn { rf.sendEffect(effect) }
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            }
                        }
                    }
                }
            }
        }
        .opacity(light.isOn ? 1 : 0.5)
        .disabled(!light.isOn)
    }
}

struct EffectCell: View {
    let effect: LightEffect
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: effect.icon)
                    .font(.caption)
                Text(effect.rawValue)
                    .font(.caption)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity)
            .background(isSelected ? Color.purple.opacity(0.3) : Color.white.opacity(0.05))
            .foregroundColor(isSelected ? .purple : .gray)
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isSelected ? Color.purple : Color.clear, lineWidth: 1.5)
            )
        }
        .buttonStyle(ScaleButtonStyle())
    }
}

// MARK: - Effect Speed
struct EffectSpeedView: View {
    @EnvironmentObject var light: LightState
    @EnvironmentObject var rf: RFControlService

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "gauge.high")
                        .foregroundColor(.purple)
                    Text("Velocidad del efecto")
                        .foregroundColor(.white)
                        .fontWeight(.medium)
                    Spacer()
                    Text(light.speedLabel)
                        .foregroundColor(.gray)
                        .font(.callout.monospacedDigit())
                }

                Slider(value: $light.effectSpeed, in: 0.0...1.0)
                    .accentColor(.purple)
                    .onChange(of: light.effectSpeed) { value in
                        rf.sendEffectSpeed(value)
                    }
            }
        }
        .opacity(light.isOn ? 1 : 0.5)
        .disabled(!light.isOn)
        .transition(.move(edge: .top).combined(with: .opacity))
    }
}

// MARK: - Connection Status
struct ConnectionStatusView: View {
    @EnvironmentObject var rf: RFControlService

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(rf.simulationMode ? Color.orange : (rf.isConnected ? Color.green : Color.red))
                .frame(width: 8, height: 8)

            Text(rf.simulationMode
                 ? "Modo simulación"
                 : (rf.isConnected ? "Conectado al controlador" : "Sin conexión"))
                .font(.caption2)
                .foregroundColor(.gray)
        }
    }
}

// MARK: - Reusable Components

struct GlassCard<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding(16)
            .background(.ultraThinMaterial)
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
    }
}

struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.94 : 1.0)
            .animation(.spring(response: 0.2), value: configuration.isPressed)
    }
}

// MARK: - Preview
#Preview {
    ContentView()
        .environmentObject(LightState())
        .environmentObject(RFControlService.shared)
}
