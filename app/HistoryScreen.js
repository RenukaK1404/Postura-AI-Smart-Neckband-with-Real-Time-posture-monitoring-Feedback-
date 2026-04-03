import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import StorageService from "../services/StorageService";

const HistoryScreen = () => {
  const [history, setHistory] = useState([]);
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadHistory = async () => {
    const data = await StorageService.getHistory();
    setHistory(data);
  };

  const clearHistory = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to delete all history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await StorageService.clearHistory();
            setHistory([]);
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Normal":
        return "#4CAF50";
      case "Warning":
        return "#FFC107";
      case "Abnormal":
        return "#F44336";
      default:
        return "#999";
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.itemData}>
        <Text style={styles.dataText}>Roll: {item.roll?.toFixed(2)}°</Text>
        <Text style={styles.dataText}>Pitch: {item.pitch?.toFixed(2)}°</Text>
        <Text style={styles.dataText}>Yaw: {item.yaw?.toFixed(2)}°</Text>
        <Text style={styles.dataText}>Tilt: {item.tiltAngle?.toFixed(2)}°</Text>
      </View>
    </View>
  );

  const chartData = {
    labels: history
      .slice(0, 10)
      .reverse()
      .map((_, i) => `${i + 1}`),
    datasets: [
      {
        data: history
          .slice(0, 10)
          .reverse()
          .map((item) => item.tiltAngle || 0),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.chartButton}
            onPress={() => setShowChart(!showChart)}
          >
            <Text style={styles.chartButtonText}>
              {showChart ? "Hide Chart" : "Show Chart"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showChart && history.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Tilt Angle Over Time</Text>
          <LineChart
            data={chartData}
            width={Dimensions.get("window").width - 40}
            height={220}
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: "#2196F3",
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No history data yet</Text>
          <Text style={styles.emptySubtext}>
            Connect your device to start monitoring
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 10,
  },
  chartButton: {
    flex: 1,
    backgroundColor: "#2196F3",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  chartButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  clearButton: {
    backgroundColor: "#F44336",
    padding: 10,
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  clearButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  chartContainer: {
    backgroundColor: "#fff",
    margin: 20,
    marginTop: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  chart: {
    borderRadius: 10,
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
  },
  item: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  timestamp: {
    fontSize: 14,
    color: "#666",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  itemData: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  dataText: {
    fontSize: 14,
    color: "#333",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: "#999",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#bbb",
    textAlign: "center",
  },
});

export default HistoryScreen;
