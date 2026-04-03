// services/BLEService.js
import { Platform } from 'react-native';

// IMPORTANT: These UUIDs must match your ESP32 code
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const SENSOR_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

// Only import BleManager on native platforms (not web)
let BleManager = null;
if (Platform.OS !== 'web') {
  try {
    BleManager = require('react-native-ble-plx').BleManager;
  } catch (error) {
    console.warn('⚠️ BLE library not available:', error);
  }
}

class BLEService {
  constructor() {
    if (Platform.OS === 'web') {
      console.warn('⚠️ BLE is not supported on web platform');
      this.manager = null;
    } else if (BleManager) {
      this.manager = new BleManager();
    } else {
      this.manager = null;
      console.warn('⚠️ BLE Manager could not be initialized');
    }
    this.device = null;
    this.isConnected = false;
  }

  // Initialize BLE Manager
  init() {
    if (Platform.OS === 'web') {
      return Promise.reject(new Error('BLE is not supported on web platform'));
    }
    
    if (!this.manager) {
      return Promise.reject(new Error('BLE Manager is not available'));
    }

    return new Promise((resolve, reject) => {
      try {
        const subscription = this.manager.onStateChange((state) => {
          if (state === 'PoweredOn') {
            subscription.remove();
            resolve();
          } else if (state === 'PoweredOff') {
            subscription.remove();
            reject(new Error('Bluetooth is powered off'));
          }
        }, true);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Scan for ESP32_IMU_Sensor device (matching HTML code)
  scanForDevice(onDeviceFound) {
    if (Platform.OS === 'web' || !this.manager) {
      console.error('❌ BLE is not available on this platform');
      return;
    }

    console.log('🔍 Scanning for ESP32_IMU_Sensor...');
    
    try {
      this.manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error('❌ Scan error:', error);
          return;
        }

        // Look for device by name (matching HTML code)
        if (device.name === 'ESP32_IMU_Sensor' || device.name === 'PostureMonitor') {
          console.log(`✅ Found ${device.name}!`);
          this.manager.stopDeviceScan();
          onDeviceFound(device);
        }
      });
    } catch (error) {
      console.error('❌ Error starting scan:', error);
    }
  }

  // Stop scanning
  stopScan() {
    if (Platform.OS === 'web' || !this.manager) {
      return;
    }
    
    try {
      this.manager.stopDeviceScan();
      console.log('⏹️ Stopped scanning');
    } catch (error) {
      console.error('❌ Error stopping scan:', error);
    }
  }

  // Connect to device
  async connect(device) {
    if (Platform.OS === 'web' || !this.manager) {
      console.error('❌ BLE is not available on this platform');
      return false;
    }

    try {
      console.log('🔗 Connecting to device...');
      
      this.device = await device.connect();
      console.log('✅ Connected!');

      await this.device.discoverAllServicesAndCharacteristics();
      console.log('✅ Services discovered!');

      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  // Disconnect from device
  async disconnect() {
    if (Platform.OS === 'web' || !this.device) {
      this.isConnected = false;
      this.device = null;
      return;
    }

    try {
      await this.device.cancelConnection();
      console.log('🔌 Disconnected');
      this.isConnected = false;
      this.device = null;
    } catch (error) {
      console.error('❌ Disconnect error:', error);
      this.isConnected = false;
      this.device = null;
    }
  }

  // Helper function to parse float from Uint8Array (little-endian)
  parseFloat32(bytes, offset) {
    const byteArray = bytes.slice(offset, offset + 4);
    const view = new DataView(byteArray.buffer, byteArray.byteOffset, byteArray.byteLength);
    return view.getFloat32(0, true); // true = little-endian
  }

  // Subscribe to sensor data updates - receives 7 floats (28 bytes)
  subscribeToSensorData(callback) {
    if (Platform.OS === 'web' || !this.manager) {
      console.error('❌ BLE is not available on this platform');
      return null;
    }

    if (!this.device) {
      console.error('❌ No device connected!');
      return null;
    }

    console.log('📡 Subscribing to sensor data...');

    const subscription = this.device.monitorCharacteristicForService(
      SERVICE_UUID,
      SENSOR_CHAR_UUID,
      (error, characteristic) => {
        if (error) {
          console.error('❌ Monitor error:', error);
          return;
        }

        if (characteristic?.value) {
          try {
            // react-native-ble-plx returns base64 string
            const base64Value = characteristic.value;
            
            // Try to decode as string first (format: "roll,pitch,tiltAngle,status,motorStatus")
            try {
              const binaryString = atob(base64Value);
              const textData = binaryString;
              
              // Check if it's a string format (contains commas)
              if (textData.includes(',')) {
                const parts = textData.split(',');
                if (parts.length >= 5) {
                  const sensorData = {
                    roll: parseFloat(parts[0]),
                    pitch: parseFloat(parts[1]),
                    tiltAngle: parseFloat(parts[2]),
                    status: parts[3],
                    motorStatus: parts[4],
                    timestamp: new Date().toISOString(),
                  };
                  callback(sensorData);
                  return;
                }
              }
            } catch (stringError) {
              // Not a string, try binary format
            }
            
            // Try binary format (7 floats = 28 bytes)
            const binaryString = atob(base64Value);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Check if we have enough bytes (7 floats = 28 bytes)
            if (bytes.length >= 28) {
              // Parse 7 floats (little-endian, 4 bytes each)
              const sensorData = {
                ax: this.parseFloat32(bytes, 0),   // Offset 0
                ay: this.parseFloat32(bytes, 4),   // Offset 4
                az: this.parseFloat32(bytes, 8),   // Offset 8
                gx: this.parseFloat32(bytes, 12),  // Offset 12
                gy: this.parseFloat32(bytes, 16),  // Offset 16
                gz: this.parseFloat32(bytes, 20),  // Offset 20
                temp: this.parseFloat32(bytes, 24), // Offset 24
                timestamp: new Date().toISOString(),
              };

              callback(sensorData);
            } else {
              console.warn('⚠️ Received incomplete data:', bytes.length, 'bytes');
            }
          } catch (parseError) {
            console.error('❌ Error parsing sensor data:', parseError);
          }
        }
      }
    );

    return subscription;
  }

  // Check connection status
  isDeviceConnected() {
    return this.isConnected && this.device !== null;
  }

  // Get device name
  getDeviceName() {
    return this.device?.name || 'Unknown';
  }
}

// Export singleton instance
export default new BLEService();