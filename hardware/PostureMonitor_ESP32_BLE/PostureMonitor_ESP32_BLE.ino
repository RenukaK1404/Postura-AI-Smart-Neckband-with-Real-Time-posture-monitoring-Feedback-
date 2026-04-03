

#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <math.h>

Adafruit_MPU6050 mpu;


#define MOTOR1_PIN 5
#define MOTOR2_PIN 18
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define SENSOR_CHAR_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define PITCH_FORWARD_THRESHOLD 25
#define PITCH_BACKWARD_THRESHOLD -15
#define ROLL_THRESHOLD 20


const unsigned long ABNORMAL_DURATION = 120000; 


unsigned long abnormalStartTime = 0;
bool isAbnormal = false;
bool motorsOn = false;
bool deviceConnected = false;
bool oldDeviceConnected = false;


BLEServer* pServer = NULL;
BLECharacteristic* pSensorCharacteristic = NULL;


class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("\n✅ Phone Connected!");
    };
    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("\n❌ Phone Disconnected!");
    }
};

// ====== Setup Function ======
void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);

  Serial.println("\n╔════════════════════════════════════╗");
  Serial.println("║   ESP32_IMU_Sensor - BLE ENABLED   ║");
  Serial.println("╚════════════════════════════════════╝\n");

  Serial.print("🔧 Initializing MPU6050... ");
  if (!mpu.begin()) {
    Serial.println("❌ FAILED!");
    Serial.println("⚠️  Check I2C connections!");
    while (1) delay(10);
  }
  Serial.println("✅ SUCCESS!");
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  Serial.print("🔧 Initializing Motors... ");
  pinMode(MOTOR1_PIN, OUTPUT);
  pinMode(MOTOR2_PIN, OUTPUT);
  digitalWrite(MOTOR1_PIN, LOW);
  digitalWrite(MOTOR2_PIN, LOW);
  Serial.println("✅ SUCCESS!");

  
  Serial.print("🔧 Initializing Bluetooth... ");
  BLEDevice::init("ESP32_IMU_Sensor");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create BLE Characteristic
  pSensorCharacteristic = pService->createCharacteristic(
                            SENSOR_CHAR_UUID,
                            BLECharacteristic::PROPERTY_READ |
                            BLECharacteristic::PROPERTY_NOTIFY
                          );
  pSensorCharacteristic->addDescriptor(new BLE2902());
  pService->start();

  // Start Advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);
  BLEDevice::startAdvertising();

  Serial.println("✅ SUCCESS!");
  Serial.println("\n📡 Broadcasting as: PostureMonitor");
  Serial.println("📱 Open your app to connect!\n");
  Serial.println("╔════════════════════════════════════╗");
  Serial.println("║         SYSTEM READY! 🚀          ║");
  Serial.println("╚════════════════════════════════════╝\n");

  delay(100);
}

// ====== Main Loop ======
void loop() {
  // Get sensor data
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  float accelX = a.acceleration.x;
  float accelY = a.acceleration.y;
  float accelZ = a.acceleration.z;

  float roll  = atan2(-accelX, sqrt(accelY * accelY + accelZ * accelZ)) * 180.0 / PI;
  float pitch = atan2(accelY, sqrt(accelX * accelX + accelZ * accelZ)) * 180.0 / PI;
  float tiltAngle = sqrt(roll * roll + pitch * pitch);

  // Detect abnormal posture
  bool abnormalPitch = (pitch > PITCH_FORWARD_THRESHOLD || pitch < PITCH_BACKWARD_THRESHOLD);
  bool abnormalRoll  = (abs(roll) > ROLL_THRESHOLD);
  isAbnormal = abnormalPitch || abnormalRoll;

  unsigned long currentTime = millis();

  // Abnormal posture handling
  if (isAbnormal) {
    if (abnormalStartTime == 0) {
      abnormalStartTime = currentTime;
    }
    else if ((currentTime - abnormalStartTime >= ABNORMAL_DURATION) && !motorsOn) {
      Serial.println("\n⚠️⚠️⚠️  ALERT: Abnormal posture for 2 minutes! ⚠️⚠️⚠️");
      digitalWrite(MOTOR1_PIN, HIGH);
      digitalWrite(MOTOR2_PIN, HIGH);
      motorsOn = true;
      Serial.println("🔊 MOTORS ACTIVATED!\n");
    }
  } 
  else {
    abnormalStartTime = 0;
    if (motorsOn) {
      digitalWrite(MOTOR1_PIN, LOW);
      digitalWrite(MOTOR2_PIN, LOW);
      motorsOn = false;
      Serial.println("\n✅ Posture normalized. Motors OFF.\n");
    }
  }

  // Prepare JSON data for BLE
  String status = isAbnormal ? "ABNORMAL" : "NORMAL";
  String motorStatus = motorsOn ? "ON" : "OFF";

  String jsonData = "{";
  jsonData += "\"roll\":" + String(roll, 2) + ",";
  jsonData += "\"pitch\":" + String(pitch, 2) + ",";
  jsonData += "\"tilt\":" + String(tiltAngle, 2) + ",";
  jsonData += "\"status\":\"" + status + "\",";
  jsonData += "\"motor\":\"" + motorStatus + "\"";
  jsonData += "}";

  // Send JSON data via BLE
  if (deviceConnected) {
    pSensorCharacteristic->setValue(jsonData.c_str());
    pSensorCharacteristic->notify();
  }

  // Handle reconnection
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("🔄 Restarted advertising");
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  // Print to Serial Monitor
  Serial.print("Accel X: "); Serial.print(accelX, 3);
  Serial.print("  Y: "); Serial.print(accelY, 3);
  Serial.print("  Z: "); Serial.print(accelZ, 3);
  Serial.print(" Roll: "); Serial.print(roll, 2); Serial.print("° ");
  Serial.print("| Pitch: "); Serial.print(pitch, 2); Serial.print("° ");
  Serial.print("| Tilt: "); Serial.print(tiltAngle, 2); Serial.print("° ");
  Serial.print("| Status: "); Serial.print(status);
  Serial.print(" | Motors: "); Serial.print(motorStatus);
  Serial.print(" | BLE: ");
  Serial.println(deviceConnected ? "✅ Connected" : "⏳ Waiting...");

  delay(200);
}
