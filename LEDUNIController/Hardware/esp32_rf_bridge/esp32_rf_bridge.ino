/**
 * LEDUNI RF Bridge – Firmware ESP32
 *
 * Recibe comandos HTTP desde la app iOS y los retransmite
 * como señales RF 433 MHz al controlador LEDUNI.
 *
 * Hardware:
 *   - ESP32 (cualquier variante)
 *   - Módulo TX RF 433 MHz conectado al pin RF_TX_PIN
 *
 * Librerías necesarias (instalar via Arduino Library Manager):
 *   - RCSwitch  (RF 433/315 MHz)
 *   - ArduinoJson
 *
 * Configuración:
 *   1. Cambiar WIFI_SSID y WIFI_PASSWORD
 *   2. Ajustar RF_TX_PIN según tu conexión
 *   3. Flashear y anotar la IP que aparece en Serial Monitor
 *   4. Introducir esa IP en la app iOS (RFControlService.swift)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <RCSwitch.h>

// ── Configuración WiFi ─────────────────────────────────────
const char* WIFI_SSID     = "TU_WIFI";
const char* WIFI_PASSWORD = "TU_CONTRASEÑA";

// ── Pines ──────────────────────────────────────────────────
const int RF_TX_PIN = 17;   // GPIO donde está conectado el TX RF

// ── Códigos RF LEDUNI ──────────────────────────────────────
// Estos códigos se obtienen haciendo sniffing del mando original
// con un receptor RF 433 MHz y la librería RCSwitch en modo receive.
// Modifica estos valores con los de tu mando específico.
const unsigned long RF_ON         = 0xFF00A8; // Encender
const unsigned long RF_OFF        = 0xFF00A5; // Apagar
const unsigned long RF_BRIGHT_UP  = 0xFF00B8; // Más brillo
const unsigned long RF_BRIGHT_DWN = 0xFF00B4; // Menos brillo

// Mapa color → código RF
const unsigned long RF_COLORS[] = {
  0xFF00D0, // Blanco
  0xFF00D1, // Rojo
  0xFF00D2, // Verde
  0xFF00D3, // Azul
  0xFF00D4, // Amarillo
  0xFF00D5, // Cian
  0xFF00D6, // Magenta
  0xFF00D7, // Naranja
  0xFF00D8, // Rosa
  0xFF00D9, // Lavanda
  0xFF00DA, // Turquesa
  0xFF00DB, // Blanco cálido
};

// Mapa efecto → código RF
const unsigned long RF_EFFECTS[] = {
  0xFF00E0, // Estático
  0xFF00E1, // Flash
  0xFF00E2, // Estroboscópico
  0xFF00E3, // Fundido
  0xFF00E4, // Transición suave
  0xFF00E5, // Salto 3 colores
  0xFF00E6, // Salto 7 colores
  0xFF00E7, // Fundido 3 colores
  0xFF00E8, // Fundido 7 colores
};

// ── Objetos globales ───────────────────────────────────────
RCSwitch rfSwitch;
WebServer server(8080);

// Último valor de brillo enviado (0–255) para simular subir/bajar
int lastBrightness = 200;

// ── Setup ──────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  rfSwitch.enableTransmit(RF_TX_PIN);
  rfSwitch.setProtocol(1);
  rfSwitch.setPulseLength(350);
  rfSwitch.setRepeatTransmit(6);

  Serial.print("Conectando a WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConectado! IP: " + WiFi.localIP().toString());

  // Rutas HTTP
  server.on("/ping",    HTTP_GET,  handlePing);
  server.on("/command", HTTP_POST, handleCommand);
  server.begin();

  Serial.println("Servidor HTTP escuchando en puerto 8080");
}

// ── Loop ───────────────────────────────────────────────────
void loop() {
  server.handleClient();
}

// ── Handlers HTTP ──────────────────────────────────────────
void handlePing() {
  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

void handleCommand() {
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"No body\"}");
    return;
  }

  StaticJsonDocument<64> doc;
  DeserializationError err = deserializeJson(doc, server.arg("plain"));
  if (err) {
    server.send(400, "application/json", "{\"error\":\"JSON invalido\"}");
    return;
  }

  uint8_t cmd   = doc["cmd"]   | 0;
  uint8_t param = doc["param"] | 0;

  processCommand(cmd, param);
  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

// ── Procesado de comandos ──────────────────────────────────
void processCommand(uint8_t cmd, uint8_t param) {
  switch (cmd) {
    case 0x10: sendRF(RF_ON);  Serial.println("[CMD] Encender");  break;
    case 0x11: sendRF(RF_OFF); Serial.println("[CMD] Apagar");    break;

    case 0x12: // Brillo (0–255)
      adjustBrightness(param);
      break;

    case 0x13: // Color
      if (param < sizeof(RF_COLORS) / sizeof(RF_COLORS[0])) {
        sendRF(RF_COLORS[param]);
        Serial.printf("[CMD] Color: %d\n", param);
      }
      break;

    case 0x14: // Efecto
      if (param >= 0x20 && param <= 0x28) {
        int idx = param - 0x20;
        sendRF(RF_EFFECTS[idx]);
        Serial.printf("[CMD] Efecto: %d\n", idx);
      }
      break;

    case 0x15: // Velocidad efecto — enviar brillo como proxy si no hay código dedicado
      Serial.printf("[CMD] Velocidad: %d\n", param);
      break;

    default:
      Serial.printf("[CMD] Desconocido: 0x%02X\n", cmd);
  }
}

// Simula cambio de brillo enviando repetidamente "más brillo" o "menos brillo"
void adjustBrightness(uint8_t target) {
  int steps = ((int)target - lastBrightness) / 25;  // ~10 pasos para todo el rango
  unsigned long code = steps > 0 ? RF_BRIGHT_UP : RF_BRIGHT_DWN;
  int absSteps = abs(steps);
  for (int i = 0; i < absSteps; i++) {
    sendRF(code);
    delay(80);
  }
  lastBrightness = target;
  Serial.printf("[CMD] Brillo: %d (%d pasos)\n", target, absSteps);
}

// Envía código RF
void sendRF(unsigned long code) {
  rfSwitch.send(code, 24);  // 24 bits — ajustar según protocolo LEDUNI
}
