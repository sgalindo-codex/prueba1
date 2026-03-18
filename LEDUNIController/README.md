# LEDUNI Controller – App iOS

App iOS para controlar las luces LED LEDUNI desde el móvil, sustituyendo el mando a distancia RF.

## Requisitos

- Xcode 15+ / iOS 17+
- iPhone (modo demo funciona sin hardware)

## Estructura del proyecto

```
LEDUNIController/
├── LEDUNIController.xcodeproj/
└── LEDUNIController/
    ├── LEDUNIControllerApp.swift     # Entry point SwiftUI
    ├── Models/
    │   └── LightState.swift          # Estado de la luz + colores + efectos
    ├── Services/
    │   └── RFControlService.swift    # Servicio de comunicación (simulado/real)
    ├── Views/
    │   └── ContentView.swift         # UI principal completa
    └── Assets.xcassets/
```

## Funcionalidades

| Feature | Estado |
|---|---|
| Encender / Apagar | ✅ |
| Control de brillo | ✅ |
| 12 colores (paleta LEDUNI) | ✅ |
| 9 efectos (flash, strobe, fade...) | ✅ |
| Control de velocidad de efecto | ✅ |
| Simulación visual de la habitación | ✅ |
| Comunicación RF real (ESP32) | 🔧 Listo para conectar |

## Modo Demo vs Hardware Real

Por defecto la app corre en **modo simulación** (sin hardware).

Para conectar hardware real:

### Hardware necesario (~10€)
- 1x ESP32 o ESP8266 (NodeMCU)
- 1x Módulo transmisor RF 433 MHz
- Cable USB

### Activar modo real en `RFControlService.swift`
```swift
var simulationMode: Bool = false          // Cambiar a false
var controllerIP: String = "192.168.1.100" // IP de tu ESP32
```

### Firmware ESP32
Ver carpeta `/Hardware/esp32_rf_bridge/` para el código Arduino del microcontrolador.

## Abrir en Xcode

```bash
open LEDUNIController.xcodeproj
```

Selecciona tu iPhone o simulador y pulsa ▶ Run.
