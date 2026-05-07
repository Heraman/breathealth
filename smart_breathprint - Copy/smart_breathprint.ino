#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

BLECharacteristic *pCharacteristic;
bool deviceConnected = false;

// UUID harus sama dengan app kamu
#define SERVICE_UUID        "12345678-1234-1234-1234-1234567890ab"
#define CHARACTERISTIC_UUID "abcd1234-5678-1234-5678-abcdef123456"

unsigned long lastSend = 0;

int rCal = 0;
int gCal = 0;
int bCal = 0;
String statusText = "Normal";

class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("APP CONNECTED");
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("APP DISCONNECTED");

    // biar bisa connect lagi setelah putus
    BLEDevice::startAdvertising();
  }
};

void setup() {
  Serial.begin(115200);

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
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->start();

  Serial.println("BLE DUMMY READY - CONNECT VIA APP");
}

void loop() {
  if (millis() - lastSend > 1000) {
    lastSend = millis();

    generateDummyData();
    sendBLE();
    printData();
  }
}

void generateDummyData() {
  rCal = random(0, 256);
  gCal = random(0, 256);
  bCal = random(0, 256);

  int level = random(0, 4);

  switch (level) {
    case 0:
      statusText = "Mild";
      break;
    case 1:
      statusText = "Normal";
      break;
    case 2:
      statusText = "Stressed";
      break;
    default:
      statusText = "Weak";
      break;
  }
}

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