#include <EEPROM.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// BLE
BLECharacteristic *pCharacteristic;
bool deviceConnected = false;

// UUID (bebas)
#define SERVICE_UUID        "12345678-1234-1234-1234-1234567890ab"
#define CHARACTERISTIC_UUID "abcd1234-5678-1234-5678-abcdef123456"

// TCS3200
const int TCS_OUT = 2;
const int TCS_S0 = 18;
const int TCS_S1 = 19;
const int TCS_S2 = 5;
const int TCS_S3 = 21;

const int LED_PIN = 23;

// RGB raw
unsigned long r, g, b;

// RGB calibrated (0–255)
int rCal, gCal, bCal;

// Kalibrasi min/max
unsigned long rMin=99999, rMax=0;
unsigned long gMin=99999, gMax=0;
unsigned long bMin=99999, bMax=0;

String statusText = "Normal";
int level = 0;

unsigned long lastRead = 0;

// ================= CB =================
class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
  }
  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
  }
};

// ================= SETUP =================
void setup() {
  Serial.begin(115200);

  // Sensor setup
  pinMode(TCS_OUT, INPUT);
  pinMode(TCS_S0, OUTPUT);
  pinMode(TCS_S1, OUTPUT);
  pinMode(TCS_S2, OUTPUT);
  pinMode(TCS_S3, OUTPUT);

  digitalWrite(TCS_S0, HIGH);
  digitalWrite(TCS_S1, HIGH);

  pinMode(LED_PIN, OUTPUT);

  // nama gw siapa
  BLEDevice::init("SmartBreathprint");
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_NOTIFY
                    );

  pCharacteristic->addDescriptor(new BLE2902());
  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->start();

  Serial.println("BLE READY - CONNECT VIA APP");
}


void loop() {

  if (millis() - lastRead > 1000) {
    lastRead = millis();

    readRGB();
    calibrateRGB();
    level = analyzeColor();
    statusText = getStatus(level);

    sendBLE();
    printData();
    updateLED(level);
  }
}


void readRGB() {
  // RED r
  digitalWrite(TCS_S2, LOW);
  digitalWrite(TCS_S3, LOW);
  r = pulseIn(TCS_OUT, LOW);

  // GREEN g
  digitalWrite(TCS_S2, HIGH);
  digitalWrite(TCS_S3, HIGH);
  g = pulseIn(TCS_OUT, LOW);

  // BLUE b
  digitalWrite(TCS_S2, HIGH);
  digitalWrite(TCS_S3, LOW);
  b = pulseIn(TCS_OUT, LOW);
}

// ================= MENGHITUNG SEBANYAK 19jt =================
void calibrateRGB() {
  
  rMin = min(rMin, r);
  rMax = max(rMax, r);

  gMin = min(gMin, g);
  gMax = max(gMax, g);

  bMin = min(bMin, b);
  bMax = max(bMax, b);

  // normalize ke 0-255
  rCal = map(r, rMin, rMax, 255, 0);
  gCal = map(g, gMin, gMax, 255, 0);
  bCal = map(b, bMin, bMax, 255, 0);
}

// ================= Kalibrasi disini kalau sensor mendeteksi fufufafa =================
int analyzeColor() {

  if (rCal > gCal && rCal > bCal) return 2; // merah dominan
  else if (gCal > rCal && gCal > bCal) return 0;
  else if (bCal > rCal && bCal > gCal) return 1;
  else return 3;
}

// ================= KET =================
String getStatus(int lvl) {
  switch(lvl) {
    case 1: return "Normal";
    case 0: return "Mild";
    case 2: return "Stressed";
    default: return "Weak";
  }
}

// ================= BLE SEND =================
void sendBLE() {
  if (deviceConnected) {
    String data = "R:" + String(rCal) +
                  " G:" + String(gCal) +
                  " B:" + String(bCal) +
                  " -> " + statusText;

    pCharacteristic->setValue(data.c_str());
    pCharacteristic->notify();
  }
}

// ================= DEBUG =================
void printData() {
  Serial.print("R:");
  Serial.print(rCal);
  Serial.print(" G:");
  Serial.print(gCal);
  Serial.print(" B:");
  Serial.print(bCal);
  Serial.print(" -> ");
  Serial.println(statusText);
}