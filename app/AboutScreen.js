// screens/AboutScreen.js
import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import StorageService from "../services/StorageService";

const AboutScreen = ({ navigation }) => {
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await StorageService.logout();
          navigation.replace("Login");
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>About</Text>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.appName}>Posture Monitor</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
        <Text style={styles.description}>
          Monitor your posture in real-time using ESP32 and MPU6050 sensor. Get
          alerts when maintaining bad posture for extended periods.
        </Text>
      </View>

      {/* Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.featureItem}>
          <View style={styles.featureBullet} />
          <Text style={styles.featureText}>Real-time Bluetooth monitoring</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={styles.featureBullet} />
          <Text style={styles.featureText}>
            Push notifications for bad posture
          </Text>
        </View>
        <View style={styles.featureItem}>
          <View style={styles.featureBullet} />
          <Text style={styles.featureText}>
            History tracking and statistics
          </Text>
        </View>
        <View style={styles.featureItem}>
          <View style={styles.featureBullet} />
          <Text style={styles.featureText}>AI-powered posture advice</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={styles.featureBullet} />
          <Text style={styles.featureText}>Hardware buzzer alerts</Text>
        </View>
      </View>

      {/* Hardware Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hardware Components</Text>
        <Text style={styles.hardwareText}>• ESP32 Microcontroller</Text>
        <Text style={styles.hardwareText}>• MPU6050 IMU Sensor</Text>
        <Text style={styles.hardwareText}>• Vibration Motors (x2)</Text>
        <Text style={styles.hardwareText}>• Bluetooth Low Energy (BLE)</Text>
      </View>

      {/* Thresholds */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alert Thresholds</Text>
        <Text style={styles.thresholdText}>Normal: Tilt angle {"<"} 20°</Text>
        <Text style={styles.thresholdText}>Warning: Tilt angle 20-30°</Text>
        <Text style={styles.thresholdText}>Abnormal: Tilt angle {">"} 30°</Text>
        <Text style={styles.thresholdText}>Alert Duration: 2 minutes</Text>
      </View>

      {/* How It Works */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <Text style={styles.instructionText}>
          1. Wear the device on the back of your neck
        </Text>
        <Text style={styles.instructionText}>
          2. Connect via Bluetooth in the Dashboard
        </Text>
        <Text style={styles.instructionText}>
          3. Monitor real-time posture angles
        </Text>
        <Text style={styles.instructionText}>
          4. Get alerts when posture is bad for 2+ minutes
        </Text>
        <Text style={styles.instructionText}>
          5. Review your posture history and statistics
        </Text>
      </View>

      {/* Developer Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Developer</Text>
        <Text style={styles.developerText}>
          Built with React Native Expo & Arduino
        </Text>
        <Text style={styles.developerText}>© 2025 Posture Monitor</Text>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#071729",
  },
  header: {
    backgroundColor: "#072146",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#e6f7ef",
  },
  section: {
    backgroundColor: "#0f2b3b",
    margin: 15,
    padding: 16,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  appName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#88f2b0",
    textAlign: "center",
    marginBottom: 5,
  },
  version: {
    fontSize: 14,
    color: "#9fd7b3",
    textAlign: "center",
    marginBottom: 15,
  },
  description: {
    fontSize: 15,
    color: "#cfeee0",
    textAlign: "center",
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#e6f7ef",
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureBullet: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: "#88f2b0",
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: "#cfeee0",
    flex: 1,
  },
  hardwareText: {
    fontSize: 15,
    color: "#cfeee0",
    marginBottom: 8,
    lineHeight: 22,
  },
  thresholdText: {
    fontSize: 15,
    color: "#cfeee0",
    marginBottom: 8,
    lineHeight: 22,
  },
  instructionText: {
    fontSize: 15,
    color: "#cfeee0",
    marginBottom: 10,
    lineHeight: 22,
  },
  developerText: {
    fontSize: 14,
    color: "#9fd7b3",
    textAlign: "center",
    marginBottom: 5,
  },
  logoutButton: {
    backgroundColor: "#203a4a",
    margin: 15,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#e6f7ef",
    fontSize: 16,
    fontWeight: "700",
  },
  bottomPadding: {
    height: 30,
  },
});

export default AboutScreen;
