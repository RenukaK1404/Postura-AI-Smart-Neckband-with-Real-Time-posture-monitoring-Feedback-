// app/DashboardScreen.js - Home Screen
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as Speech from "expo-speech";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BleManager } from "react-native-ble-plx";
import { LineChart } from "react-native-chart-kit";
import { getThresholds } from "../utils/postureCalculator";


let MODEL_API_URL = null;
try {
  
  const secret = require("../config/secret");
  MODEL_API_URL = secret?.MODEL_API_URL || null;
} catch (e) {
  MODEL_API_URL = null;
}


const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const DashboardScreen = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [roll, setRoll] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [tilt, setTilt] = useState(0);
  const [status, setStatus] = useState("NORMAL");
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [motorStatus, setMotorStatus] = useState("OFF");
  const [useModel, setUseModel] = useState(!!MODEL_API_URL);
  const [abnormalStartTime, setAbnormalStartTime] = useState(null);
  const [lastAlertTime, setLastAlertTime] = useState(null);

  const subscriptionRef = useRef(null);
  const characteristicRef = useRef(null);
  const deviceRef = useRef(null);
  const managerRef = useRef(null);
  const notificationListenerRef = useRef(null);
  const previousMotorStatusRef = useRef("OFF");
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const thresholds = getThresholds();
  
  const rawRef = useRef({ ax: null, ay: null, az: null });
  const predictTimerRef = useRef(null);
  
  const MAX_HISTORY = 50;
  const [historyRoll, setHistoryRoll] = useState([]);
  const [historyPitch, setHistoryPitch] = useState([]);
  const [historyTilt, setHistoryTilt] = useState([]);
  const [historyLabels, setHistoryLabels] = useState([]);
  const chartWidth = Dimensions.get("window").width - 40;

  useEffect(() => {
    
    if (Platform.OS !== "web") {
      try {
        managerRef.current = new BleManager();
      } catch (error) {
        console.error("Failed to initialize BLE manager:", error);
      }
    }

    registerForPushNotifications();

    
    try {
      notificationListenerRef.current =
        Notifications.addNotificationReceivedListener((notification) => {
          try {
            const content = notification?.request?.content || {};
            const text =
              (content.title ? `${content.title}. ` : "") +
              (content.body || "");
            if (text) {
              try {
                Speech.speak(text, { rate: 1.0, pitch: 1.0 });
                console.log("Spoken notification:", text);
              } catch (sErr) {
                console.warn("Speech on notification failed:", sErr);
              }
            }
          } catch (e) {
            console.warn("Notification handler error:", e);
          }
        });
    } catch (e) {
      console.warn("Could not attach notification listener:", e);
    }

    return () => {

      if (
        characteristicRef.current &&
        characteristicRef.current.stopNotifications
      ) {
        try {
          characteristicRef.current.stopNotifications().catch(() => {});
        } catch (e) {
          console.error("Error cleaning up web notifications:", e);
        }
        characteristicRef.current = null;
      }

      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }

      if (notificationListenerRef.current) {
        try {
          notificationListenerRef.current.remove();
        } catch (e) {
          
        }
        notificationListenerRef.current = null;
      }

      if (managerRef.current) {
        try {
          managerRef.current.stopDeviceScan();
          managerRef.current.destroy();
        } catch (e) {
          console.error("Error cleaning up BLE manager:", e);
        }
      }
      
      if (predictTimerRef.current) {
        clearTimeout(predictTimerRef.current);
        predictTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (motorStatus === "ON" && previousMotorStatusRef.current === "OFF") {
      sendPostureAlert();

      startPulseAnimation();
    } else if (motorStatus === "OFF") {
      stopPulseAnimation();
    }
    previousMotorStatusRef.current = motorStatus;
  }, [motorStatus]);

  
  useEffect(() => {
    schedulePrediction();
    
  }, [roll, pitch, tilt]);

  
  useEffect(() => {
    
    setHistoryRoll((h) => {
      const next = [...h, Number(roll.toFixed(2))];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setHistoryPitch((h) => {
      const next = [...h, Number(pitch.toFixed(2))];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    // tilt may not be updated by all payloads; keep 0 if undefined
    setHistoryTilt((h) => {
      const t = typeof tilt !== "undefined" ? tilt : null;
      const next = [...h, t === null ? 0 : Number(t)];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });

    setHistoryLabels((l) => {
      const next = [...l, ""]; // labels intentionally left blank for sparkline look
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
  }, [roll, pitch, tilt]);

  useEffect(() => {
    if (isConnected && status === "ABNORMAL" && motorStatus === "OFF") {
      if (abnormalStartTime === null) {
        setAbnormalStartTime(Date.now());
      } else {
        const elapsed = Date.now() - abnormalStartTime;
        if (elapsed >= thresholds.ABNORMAL_DURATION) {
          setMotorStatus("ON");
        }
      }
    } else if (status === "NORMAL") {
      setAbnormalStartTime(null);
      if (motorStatus === "ON") {
        setMotorStatus("OFF");
      }
    }
  }, [status, isConnected, motorStatus]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  function base64ToDataView(base64) {
    const binary =
      typeof global.atob === "function"
        ? global.atob(base64)
        : Buffer.from(base64, "base64").toString("binary");
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return new DataView(bytes.buffer);
  }

  // Debounced prediction scheduler: runs predict once per 500ms max
  const schedulePrediction = (delay = 500) => {
    if (!useModel || !MODEL_API_URL) return;
    if (predictTimerRef.current) clearTimeout(predictTimerRef.current);
    predictTimerRef.current = setTimeout(() => {
      predictCurrentPose().catch((e) => console.warn("Predict error:", e));
      predictTimerRef.current = null;
    }, delay);
  };

  // Call the configured model endpoint with available sensors; expects { label: 'NORMAL' | 'ABNORMAL' }
  const predictCurrentPose = async () => {
    if (!MODEL_API_URL) return;
    try {
      const body = {
        roll: Number(roll),
        pitch: Number(pitch),
        tilt: Number(tilt),
        ax: rawRef.current.ax,
        ay: rawRef.current.ay,
        az: rawRef.current.az,
      };

      const res = await fetch(MODEL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        console.warn("Model server responded with", res.status);
        return;
      }

      const json = await res.json();
      // Accept either { label: 'ABNORMAL' } or { prediction: 'ABNORMAL' }
      const label = json?.label || json?.prediction || json?.result;
      if (typeof label === "string") {
        const normalized = label.toUpperCase();
        if (normalized === "ABNORMAL" || normalized === "BAD")
          setStatus("ABNORMAL");
        else setStatus("NORMAL");
      }
    } catch (e) {
      console.warn("Model prediction failed:", e);
    }
  };

  // Robust base64 -> UTF-8 string helper (works in RN, Node and browser)
  function decodeBase64ToUtf8(base64) {
    try {
      if (typeof Buffer !== "undefined" && Buffer.from) {
        return Buffer.from(base64, "base64").toString("utf8");
      }
    } catch (e) {
      // ignore
    }

    if (typeof global.atob === "function") {
      // atob returns a binary string; JSON payloads are ASCII so this is safe
      try {
        return global.atob(base64);
      } catch (e) {
        return null;
      }
    }

    return null;
  }

  async function handleDataReceived(event) {
    let value;

    if (event && event.target && event.target.value) {
      // Web Bluetooth: DataView
      value = event.target.value;
    } else if (event && event.value) {
      // Native BLE: base64 string
      value = event.value;
    } else {
      console.warn("No data received");
      return;
    }

    try {
      // If DataView (web), decode via TextDecoder
      if (typeof DataView !== "undefined" && value instanceof DataView) {
        let text = "";
        try {
          if (typeof TextDecoder !== "undefined") {
            text = new TextDecoder().decode(value.buffer);
          } else {
            for (let i = 0; i < value.byteLength; i++)
              text += String.fromCharCode(value.getUint8(i));
          }
        } catch (e) {
          console.warn("DataView decode failed", e);
          return;
        }

        const trimmed = text.trim();
        if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
          console.log("Incomplete JSON (web) skipped:", trimmed);
          return;
        }

        const json = JSON.parse(trimmed);
        const {
          roll: r,
          pitch: p,
          tilt: t,
          status: s,
          motor,
          ax,
          ay,
          az,
        } = json;
        if (typeof r === "number") setRoll(r);
        if (typeof p === "number") setPitch(p);
        if (typeof t === "number") setTilt(t);
        if (typeof s === "string" && !useModel) setStatus(s); // if using model, derive status from model
        if (typeof motor === "string") setMotorStatus(motor);

        // store raw accelerometer if present for model input
        if (typeof ax === "number") rawRef.current.ax = ax;
        if (typeof ay === "number") rawRef.current.ay = ay;
        if (typeof az === "number") rawRef.current.az = az;

        // request model prediction (debounced)
        schedulePrediction();
        return;
      }

      // If string, assume base64 from native BLE
      if (typeof value === "string") {
        const decoded = decodeBase64ToUtf8(value);
        if (!decoded) {
          console.warn("Could not decode base64 payload");
          return;
        }

        const trimmed = decoded.trim();
        if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
          console.log("Incomplete JSON skipped:", trimmed);
          return;
        }

        const json = JSON.parse(trimmed);
        const {
          roll: r,
          pitch: p,
          tilt: t,
          status: s,
          motor,
          ax,
          ay,
          az,
        } = json;
        if (typeof r === "number") setRoll(r);
        if (typeof p === "number") setPitch(p);
        if (typeof t === "number") setTilt(t);
        if (typeof s === "string" && !useModel) setStatus(s);
        if (typeof motor === "string") setMotorStatus(motor);

        if (typeof ax === "number") rawRef.current.ax = ax;
        if (typeof ay === "number") rawRef.current.ay = ay;
        if (typeof az === "number") rawRef.current.az = az;

        schedulePrediction();
        return;
      }

      console.warn("Unknown BLE value type:", typeof value);
    } catch (err) {
      console.warn("Failed to parse JSON from BLE:", err);
    }
  }

  const requestBluetoothPermissions = async () => {
    if (Platform.OS === "android") {
      if (Platform.Version >= 31) {
        const permissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          permissions["android.permission.BLUETOOTH_SCAN"] === "granted" &&
          permissions["android.permission.BLUETOOTH_CONNECT"] === "granted" &&
          permissions["android.permission.ACCESS_FINE_LOCATION"] === "granted"
        );
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === "granted";
      }
    }
    return true;
  };

  const registerForPushNotifications = async () => {
    if (!Device.isDevice) {
      console.log("Notifications only work on physical devices");
      return;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Notification permissions are required for alerts"
      );
    }
  };

  const sendPostureAlert = async () => {
    const title = "Posture alert";
    const body =
      "Posture abnormal — please fix your position and take a short rest.";

    // Voice alert (best-effort)
    try {
      Speech.speak(body, {
        pitch: 1.0,
        rate: 1.0,
      });
      console.log("Voice alert spoken:", body);
    } catch (err) {
      console.warn("Voice alert failed:", err);
    }

    if (Platform.OS === "web") {
      // Web / localhost: fallback alert
      alert(`${title}\n${body}`);
      console.log("Web alert simulated:", title, body);
    } else {
      // Native notification
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null, // immediate
        });

        // In-app alert
        try {
          Alert.alert(title, body);
        } catch (e) {
          /* ignore */
        }
        console.log("Native notification + voice alert sent!");
      } catch (error) {
        console.error("❌ Notification error:", error);
      }
    }

    setLastAlertTime(new Date());
  };

  // Connect via Web Bluetooth (for web platform)
  async function connectWebBluetooth() {
    if (!navigator.bluetooth) {
      Alert.alert(
        "Web Bluetooth not supported",
        "Use Chrome/Edge on Android or desktop for BLE via browser."
      );
      return;
    }

    try {
      setConnectionStatus("Requesting device...");
      setIsScanning(true);

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: "ESP32_IMU_Sensor" }],
        optionalServices: [SERVICE_UUID],
      });

      // save web device reference for potential writes
      try {
        deviceRef.current = device;
      } catch (e) {
        // ignore
      }

      setConnectionStatus("Connecting...");
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(
        CHARACTERISTIC_UUID
      );

      characteristicRef.current = characteristic;
      await characteristic.startNotifications();
      characteristic.addEventListener(
        "characteristicvaluechanged",
        handleDataReceived
      );

      setIsConnected(true);
      setIsScanning(false);
      setConnectionStatus("Connected");
      Alert.alert("Success", "Connected to ESP32!");
    } catch (err) {
      console.error("Web Bluetooth connection error:", err);
      setIsConnected(false);
      setIsScanning(false);
      setConnectionStatus("Disconnected");
      Alert.alert("Connection failed", err.message || String(err));
    }
  }

  async function connectNative() {
    if (!managerRef.current) {
      Alert.alert("BLE Not available", "BLE manager not initialized");
      return;
    }

    // Request permissions on Android
    if (Platform.OS === "android") {
      const granted = await requestBluetoothPermissions();
      if (!granted) {
        Alert.alert("Permission Denied", "Bluetooth permissions are required");
        return;
      }
    }

    setConnectionStatus("Scanning...");
    setIsScanning(true);
    const manager = managerRef.current;

    manager.startDeviceScan([SERVICE_UUID], null, async (error, device) => {
      if (error) {
        console.warn("Scan error", error);
        setConnectionStatus("Disconnected");
        setIsScanning(false);
        return;
      }

      if (!device) return;

      // Match by name or service
      if (
        device.name === "ESP32_IMU_Sensor" ||
        (device.serviceUUIDs && device.serviceUUIDs.includes(SERVICE_UUID))
      ) {
        setConnectionStatus(`Connecting to ${device.name || device.id}...`);
        manager.stopDeviceScan();

        try {
          const connectedDevice = await device.connect();
          await connectedDevice.discoverAllServicesAndCharacteristics();

          // keep reference for write operations (calibration commands)
          deviceRef.current = connectedDevice;

          subscriptionRef.current =
            connectedDevice.monitorCharacteristicForService(
              SERVICE_UUID,
              CHARACTERISTIC_UUID,
              (error, characteristic) => {
                if (error) {
                  console.warn("BLE Monitor Error:", error);
                  return;
                }

                {
                  try {
                    const decoded = decodeBase64ToUtf8(characteristic.value);
                    if (!decoded) {
                      console.log("Could not decode characteristic value");
                      return;
                    }

                    const trimmed = decoded.trim();
                    // Handle partial or malformed data safely
                    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
                      console.log("Incomplete JSON skipped:", trimmed);
                      return;
                    }

                    const json = JSON.parse(trimmed);
                    const { roll, pitch, tilt: t, status, motor } = json;

                    // Update UI in real-time (include tilt)
                    if (typeof roll === "number") setRoll(roll);
                    if (typeof pitch === "number") setPitch(pitch);
                    if (typeof t === "number") setTilt(t);
                    if (typeof status === "string") setStatus(status);
                    if (typeof motor === "string") setMotorStatus(motor);

                    console.log("Data received:", json);
                  } catch (err) {
                    console.warn("JSON Parse Error:", err);
                  }
                }
              }
            );

          setIsConnected(true);
          setIsScanning(false);
          setConnectionStatus("Connected");
          Alert.alert("Success", "Connected to ESP32!");
        } catch (e) {
          console.warn("Connect failed", e);
          setIsConnected(false);
          setIsScanning(false);
          setConnectionStatus("Disconnected");
          Alert.alert("Connect failed", String(e));
        }
      }
    });

    setTimeout(() => {
      if (isScanning) {
        manager.stopDeviceScan();
        setIsScanning(false);
        setConnectionStatus("Disconnected");
        Alert.alert(
          "Timeout",
          "Could not find ESP32 device. Make sure it is powered on and nearby."
        );
      }
    }, 15000);
  }

  // Main connect handler
  const handleConnect = () => {
    if (isConnected) {
      handleDisconnect();
      setTimeout(() => {
        if (Platform.OS === "web") {
          connectWebBluetooth();
        } else {
          connectNative();
        }
      }, 500);
    } else {
      if (Platform.OS === "web") {
        connectWebBluetooth();
      } else {
        connectNative();
      }
    }
  };

  const handleDisconnect = async () => {
    // Cleanup web Bluetooth
    if (
      characteristicRef.current &&
      characteristicRef.current.stopNotifications
    ) {
      try {
        characteristicRef.current.removeEventListener(
          "characteristicvaluechanged",
          handleDataReceived
        );
        await characteristicRef.current.stopNotifications();
      } catch (e) {
        console.error("Error stopping web notifications:", e);
      }
      characteristicRef.current = null;
    }

    // Cleanup native BLEif (characteristic?.value)
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }

    // clear stored device reference
    deviceRef.current = null;

    if (managerRef.current) {
      try {
        managerRef.current.stopDeviceScan();
      } catch (e) {
        console.error("Error stopping scan:", e);
      }
    }

    setIsConnected(false);
    setIsScanning(false);
    setConnectionStatus("Disconnected");
    setRoll(0);
    setPitch(0);
    setStatus("NORMAL");
    setMotorStatus("OFF");
    setAbnormalStartTime(null);
  };

  const getStatusColor = () => {
    if (status === "ABNORMAL") return "#FF6B6B"; // noticeable accent for abnormal
    return "#2ecc71"; // green for normal
  };

  // Attempt to send a calibration command to the device (best-effort)
  // (Calibration UI removed) calibration can still be triggered via BLE if needed by firmware

  // Manual test for TTS (invoked by UI button)
  const handleTestVoice = () => {
    const text = "This is a posture assistant voice test.";
    try {
      Speech.speak(text, { pitch: 1.0, rate: 1.0 });
      console.log("Test voice invoked:", text);
    } catch (e) {
      console.warn("Test voice failed:", e);
      Alert.alert("TTS failed", String(e));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Home</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isConnected ? "#144d2b" : "#3a3f44" },
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {isConnected ? "Connected" : "Disconnected"}
            </Text>
          </View>
        </View>

        {/* Connection Status */}
        <View style={styles.connectionStatusCard}>
          <Text style={styles.connectionStatusText}>
            Status: {connectionStatus}
          </Text>
        </View>

        {/* Connection Button - Always Visible */}
        <TouchableOpacity
          style={[
            styles.connectButton,
            isScanning && styles.connectButtonScanning,
            isConnected && styles.connectButtonConnected,
            (isScanning || (Platform.OS === "web" && !isConnected)) &&
              styles.connectButtonDisabled,
          ]}
          onPress={handleConnect}
          disabled={isScanning}
        >
          <Text style={styles.connectButtonText}>
            {isScanning
              ? "Scanning for ESP32..."
              : isConnected
              ? "Reconnect ESP32"
              : "Connect to ESP32"}
          </Text>
        </TouchableOpacity>

        {/* Web Platform Warning */}
        {Platform.OS === "web" && !isConnected && (
          <View style={styles.webWarningCard}>
            <Text style={styles.webWarningSubtext}>
              Please use the mobile app to connect to your ESP32
            </Text>
          </View>
        )}

        {/* Disconnect Button (only show when connected) */}
        {isConnected && (
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={handleDisconnect}
          >
            <Text style={styles.disconnectButtonText}>Disconnect</Text>
          </TouchableOpacity>
        )}

        {isConnected && (
          <>
            {/* Posture Status Card */}
            <Animated.View
              style={[
                styles.statusCard,
                {
                  transform: [{ scale: motorStatus === "ON" ? pulseAnim : 1 }],
                },
              ]}
            >
              <Text style={styles.statusCardTitle}>Posture Status</Text>
              <View style={styles.statusIndicator}>
                <View
                  style={[
                    styles.statusDot,
                    status === "ABNORMAL"
                      ? styles.statusDotAbnormal
                      : styles.statusDotNormal,
                  ]}
                />
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                  {status}
                </Text>
              </View>
            </Animated.View>

            {/* Live chart for roll / pitch / tilt */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Posture (recent)</Text>
              <LineChart
                data={{
                  labels: historyLabels,
                  datasets: [
                    {
                      data: historyRoll,
                      color: () => "#88f2b0",
                      strokeWidth: 2,
                    },
                    {
                      data: historyPitch,
                      color: () => "#2ecc71",
                      strokeWidth: 2,
                    },
                    {
                      data: historyTilt,
                      color: () => "#f6c85f",
                      strokeWidth: 2,
                    },
                  ],
                  legend: ["Roll", "Pitch", "Tilt"],
                }}
                width={chartWidth}
                height={200}
                yAxisSuffix="°"
                withDots={false}
                withInnerLines={false}
                chartConfig={{
                  backgroundGradientFrom: "#071729",
                  backgroundGradientTo: "#072146",
                  color: (opacity = 1) => `rgba(200,255,220, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(191,230,201, ${opacity})`,
                  propsForBackgroundLines: { stroke: "#0f2438" },
                  decimalPlaces: 1,
                }}
                style={{
                  marginVertical: 8,
                  borderRadius: 12,
                }}
                bezier
              />
            </View>

            {/* Roll and Pitch Display */}
            <View style={styles.dataGrid}>
              <View style={styles.dataCard}>
                <Text style={styles.dataLabel}> Roll </Text>
                <Text style={styles.dataValue}>{roll.toFixed(2)}°</Text>
                <Text style={styles.dataUnit}>Lateral Tilt</Text>
              </View>

              <View style={styles.dataCard}>
                <Text style={styles.dataLabel}>Pitch</Text>
                <Text style={styles.dataValue}>{pitch.toFixed(2)}°</Text>
                <Text style={styles.dataUnit}>Forward/Backward</Text>
              </View>
            </View>

            {/* Calibrate Button placed after Roll/Pitch display */}
            {/* Calibrate button removed per user request */}

            {/* Test Voice Button */}
            <TouchableOpacity
              style={styles.testVoiceButton}
              onPress={handleTestVoice}
            >
              <Text style={styles.testVoiceButtonText}>Test Voice</Text>
            </TouchableOpacity>

            {/* Motor Status Alert */}
            <View
              style={[
                styles.motorCard,
                motorStatus === "ON"
                  ? styles.motorCardActive
                  : styles.motorCardInactive,
              ]}
            >
              <Text style={styles.motorIcon}>
                {motorStatus === "ON" ? "Active" : "Inactive"}
              </Text>
              <View style={styles.motorInfo}>
                <Text style={styles.motorTitle}>
                  {motorStatus === "ON" ? "Alert Active" : "Alert Inactive"}
                </Text>
                <Text style={styles.motorDescription}>
                  {motorStatus === "ON"
                    ? "Abnormal posture detected for 2+ minutes!"
                    : "Monitoring posture..."}
                </Text>
              </View>
            </View>

            <View style={styles.thresholdCard}>
              <Text style={styles.thresholdTitle}> Threshold Angles</Text>
              <View style={styles.thresholdRow}>
                <Text style={styles.thresholdLabel}>Pitch Forward:</Text>
                <Text style={styles.thresholdValue}>
                  {thresholds.PITCH_FORWARD_THRESHOLD}°
                </Text>
              </View>
              <View style={styles.thresholdRow}>
                <Text style={styles.thresholdLabel}>Pitch Backward:</Text>
                <Text style={styles.thresholdValue}>
                  {thresholds.PITCH_BACKWARD_THRESHOLD}°
                </Text>
              </View>
              <View style={styles.thresholdRow}>
                <Text style={styles.thresholdLabel}>Roll Threshold:</Text>
                <Text style={styles.thresholdValue}>
                  ±{thresholds.ROLL_THRESHOLD}°
                </Text>
              </View>
              <View style={styles.thresholdRow}>
                <Text style={styles.thresholdLabel}>Alert Duration:</Text>
                <Text style={styles.thresholdValue}>2 minutes</Text>
              </View>
            </View>

            {/* Last Alert Time */}
            {lastAlertTime && (
              <View style={styles.alertTimeCard}>
                <Text style={styles.alertTimeText}>
                  Last Alert: {lastAlertTime.toLocaleTimeString()}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Not Connected Message */}
        {!isConnected && !isScanning && (
          <View style={styles.notConnectedCard}>
            <Text style={styles.notConnectedText}>
              Press "Connect to ESP32" to start monitoring
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#071729",
  },
  contentContainer: {
    paddingBottom: 30,
    flexGrow: 1,
  },
  header: {
    backgroundColor: "#072146",
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#e6f7ef",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: "#e6f7ef",
    fontSize: 12,
    fontWeight: "700",
  },
  connectButton: {
    backgroundColor: "#0b3758",
    padding: 18,
    margin: 20,
    marginTop: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  connectButtonScanning: {
    backgroundColor: "#144d2b",
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectButtonText: {
    color: "#e6f7ef",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  disconnectButton: {
    backgroundColor: "#203a4a",
    padding: 14,
    margin: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  disconnectButtonText: {
    color: "#f1f9f4",
    fontSize: 16,
    fontWeight: "700",
  },
  connectButtonConnected: {
    backgroundColor: "#144d2b",
  },
  connectionStatusCard: {
    backgroundColor: "#0f2b3b",
    margin: 20,
    marginTop: 10,
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  connectionStatusText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#cfeee0",
  },
  statusCard: {
    backgroundColor: "#0f2b3b",
    margin: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  statusCardTitle: {
    fontSize: 16,
    color: "#bfe6c9",
    marginBottom: 12,
    fontWeight: "600",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statusIcon: {
    fontSize: 40,
    marginRight: 10,
  },
  statusText: {
    fontSize: 28,
    fontWeight: "700",
  },
  dataGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dataCard: {
    backgroundColor: "#0f2b3b",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  dataLabel: {
    fontSize: 14,
    color: "#bfe6c9",
    marginBottom: 8,
    fontWeight: "600",
  },
  dataValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#88f2b0",
    marginBottom: 5,
  },
  dataUnit: {
    fontSize: 11,
    color: "#9fd7b3",
  },
  motorCard: {
    flexDirection: "row",
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  motorCardActive: {
    backgroundColor: "#142e2a",
    borderWidth: 1,
    borderColor: "#2ecc71",
  },
  motorCardInactive: {
    backgroundColor: "#0f2b3b",
    borderWidth: 1,
    borderColor: "#203a4a",
  },
  motorIcon: {
    fontSize: 14,
    marginRight: 12,
    color: "#cfeee0",
  },
  motorInfo: {
    flex: 1,
  },
  motorTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 5,
    color: "#e6f7ef",
  },
  motorDescription: {
    fontSize: 13,
    color: "#cfeee0",
  },
  thresholdCard: {
    backgroundColor: "#0f2b3b",
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  thresholdTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#e6f7ef",
  },
  thresholdRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  thresholdLabel: {
    fontSize: 14,
    color: "#bfe6c9",
  },
  thresholdValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#88f2b0",
  },
  alertTimeCard: {
    backgroundColor: "#102a2c",
    margin: 20,
    marginTop: 0,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  alertTimeText: {
    fontSize: 13,
    color: "#9fd7b3",
    fontWeight: "600",
  },
  instructionsCard: {
    backgroundColor: "#0f2b3b",
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#e6f7ef",
  },
  instructionsText: {
    fontSize: 14,
    color: "#cfeee0",
    marginBottom: 8,
    lineHeight: 20,
  },
  notConnectedCard: {
    alignItems: "center",
    marginTop: 50,
    padding: 24,
    backgroundColor: "#0f2b3b",
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  notConnectedIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  notConnectedText: {
    fontSize: 16,
    color: "#cfeee0",
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "600",
  },
  notConnectedSubtext: {
    fontSize: 14,
    color: "#9fd7b3",
    textAlign: "center",
  },
  webWarningCard: {
    backgroundColor: "#0f2438",
    margin: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#144d2b",
  },
  webWarningText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#bfe6c9",
    marginBottom: 10,
    textAlign: "center",
  },
  webWarningSubtext: {
    fontSize: 14,
    color: "#9fd7b3",
    textAlign: "center",
  },
  chartContainer: {
    marginHorizontal: 20,
    backgroundColor: "#0f2438",
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  chartTitle: {
    color: "#e6f7ef",
    fontWeight: "700",
    marginBottom: 6,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 8,
    marginRight: 10,
  },
  statusDotNormal: {
    backgroundColor: "#2ecc71",
  },
  statusDotAbnormal: {
    backgroundColor: "#FF6B6B",
  },

  testVoiceButton: {
    backgroundColor: "#0b3758",
    padding: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  testVoiceButtonText: {
    color: "#e6f7ef",
    fontWeight: "700",
    fontSize: 16,
  },
});

export default DashboardScreen;
