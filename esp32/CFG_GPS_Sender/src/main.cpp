/**
 * CFG Digital Twin — ESP32 GPS Position Sender
 *
 * Hardware:
 *   NEO-6M GPS  →  ESP32 WROOM-32
 *   VCC         →  3.3V
 *   GND         →  GND
 *   TX          →  GPIO12 (UART1 RX)
 *   RX          →  GPIO13 (UART1 TX)
 *
 * Every 3 seconds, sends a POST request to the FastAPI backend with
 * the current GPS position, speed, altitude, and satellite count.
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>

// ── Configuration — edit these before flashing ────────────────────────────

const char* WIFI_SSID     = "vivo Y36";
const char* WIFI_PASSWORD = "ramezy12";

// Replace with the IP shown in your laptop terminal when you run uvicorn
const char* BACKEND_URL = "http://192.168.1.159:8000/api/train/position";

// ── GPS UART wiring ────────────────────────────────────────────────────────

#define GPS_RX_PIN   12      // GPS TX  → ESP32 GPIO12
#define GPS_TX_PIN   13      // GPS RX  ← ESP32 GPIO13
#define GPS_BAUD     9600    // NEO-6M default baud rate

// ── Timing ─────────────────────────────────────────────────────────────────

#define SEND_INTERVAL_MS  3000    // Send every 3 seconds
#define WIFI_RETRY_MS     10000   // Retry WiFi every 10 s when disconnected

// ── Globals ────────────────────────────────────────────────────────────────

TinyGPSPlus     gps;
HardwareSerial  GPSSerial(1);   // UART1

unsigned long lastSendTime  = 0;
unsigned long lastWifiRetry = 0;

// ── WiFi ───────────────────────────────────────────────────────────────────

void connectWiFi() {
    Serial.printf("\n[WiFi] Connecting to \"%s\"", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
        delay(500);
        Serial.print(".");
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WiFi] Connected — IP: %s\n",
            WiFi.localIP().toString().c_str());
    } else {
        Serial.println("\n[WiFi] Connection failed — will retry in loop.");
        WiFi.disconnect(true);
    }
}

// ── ISO 8601 timestamp from GPS time fields ────────────────────────────────

String buildTimestamp() {
    if (!gps.date.isValid() || !gps.time.isValid()) {
        return "1970-01-01T00:00:00";
    }
    char buf[25];
    snprintf(buf, sizeof(buf),
        "%04d-%02d-%02dT%02d:%02d:%02d",
        gps.date.year(),   gps.date.month(),  gps.date.day(),
        gps.time.hour(),   gps.time.minute(), gps.time.second());
    return String(buf);
}

// ── Build JSON and POST to FastAPI ─────────────────────────────────────────

void sendPosition() {
    StaticJsonDocument<256> doc;
    doc["lat"]        = serialized(String(gps.location.lat(),  6));
    doc["lng"]        = serialized(String(gps.location.lng(),  6));
    doc["speed_kmh"]  = serialized(String(gps.speed.kmph(),    1));
    doc["altitude_m"] = serialized(String(gps.altitude.meters(), 1));
    doc["satellites"] = (int)gps.satellites.value();
    doc["timestamp"]  = buildTimestamp();

    String payload;
    serializeJson(doc, payload);

    Serial.println("\n[GPS] ─────────────────────────────────");
    Serial.printf("  lat        : %.6f\n",  gps.location.lat());
    Serial.printf("  lng        : %.6f\n",  gps.location.lng());
    Serial.printf("  speed      : %.1f km/h\n", gps.speed.kmph());
    Serial.printf("  altitude   : %.1f m\n",    gps.altitude.meters());
    Serial.printf("  satellites : %d\n",    (int)gps.satellites.value());
    Serial.printf("  timestamp  : %s\n",    buildTimestamp().c_str());

    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(5000);

    int httpCode = http.POST(payload);

    if (httpCode > 0) {
        Serial.printf("[HTTP] Status: %d\n", httpCode);
        if (httpCode == 200) {
            Serial.printf("[HTTP] Response: %s\n", http.getString().c_str());
        } else {
            Serial.printf("[HTTP] Unexpected status — body: %s\n",
                http.getString().c_str());
        }
    } else {
        Serial.printf("[HTTP] Backend unreachable — error: %s\n",
            http.errorToString(httpCode).c_str());
    }

    http.end();
}

// ── Setup ──────────────────────────────────────────────────────────────────

void setup() {
    Serial.begin(115200);
    delay(500);

    Serial.println("\n╔══════════════════════════════════╗");
    Serial.println("║  CFG Digital Twin — GPS Sender   ║");
    Serial.println("╚══════════════════════════════════╝");

    GPSSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
    Serial.printf("[GPS] UART1 ready — RX=GPIO%d  TX=GPIO%d  Baud=%d\n",
        GPS_RX_PIN, GPS_TX_PIN, GPS_BAUD);

    connectWiFi();
}

// ── Main loop ──────────────────────────────────────────────────────────────

void loop() {
    while (GPSSerial.available() > 0) {
        gps.encode(GPSSerial.read());
    }

    unsigned long now = millis();

    if (now - lastSendTime >= SEND_INTERVAL_MS) {
        lastSendTime = now;

        if (!gps.location.isValid()) {
            int sats = gps.satellites.isValid() ? (int)gps.satellites.value() : 0;
            Serial.printf("[GPS] Waiting for fix — satellites in view: %d\n", sats);
            return;
        }

        if (WiFi.status() != WL_CONNECTED) {
            if (now - lastWifiRetry >= WIFI_RETRY_MS) {
                lastWifiRetry = now;
                Serial.println("[WiFi] Disconnected — retrying...");
                connectWiFi();
            } else {
                Serial.println("[WiFi] Disconnected — waiting before next retry.");
            }
            return;
        }

        sendPosition();
    }
}
