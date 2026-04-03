// components/StatusIndicator.js
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const StatusIndicator = ({ tiltAngle, status }) => {
  // Determine color based on tilt angle
  const getStatusColor = () => {
    if (tiltAngle < 20) return "#4CAF50"; // Green - Normal
    if (tiltAngle >= 20 && tiltAngle <= 30) return "#FF9800"; // Yellow - Warning
    return "#F44336"; // Red - Abnormal
  };

  const getStatusText = () => {
    if (tiltAngle < 20) return "NORMAL";
    if (tiltAngle >= 20 && tiltAngle <= 30) return "WARNING";
    return "ABNORMAL";
  };

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: "#0f2b3b" }]}>
        <View style={[styles.dot, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.statusText}>{getStatusText()}</Text>
        <Text style={styles.angleText}>{tiltAngle.toFixed(1)}°</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 20,
  },
  indicator: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e6f7ef",
    marginBottom: 5,
  },
  angleText: {
    fontSize: 18,
    color: "#cfeee0",
    fontWeight: "600",
  },
});

export default StatusIndicator;
