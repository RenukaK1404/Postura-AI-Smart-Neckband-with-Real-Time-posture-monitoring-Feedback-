// App.js
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Import Screens
import AboutScreen from "./app/AboutScreen";
import AskAdviceScreen from "./app/AskAdviceScreen";
import DashboardScreen from "./app/DashboardScreen";
import LoginScreen from "./app/LoginScreen";

// Import Storage Service
import StorageService from "./services/StorageService";

const Tab = createBottomTabNavigator();

// Main Tabs Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#88f2b0",
        tabBarInactiveTintColor: "#9fd7b3",
        tabBarStyle: {
          height: 64,
          paddingBottom: 6,
          paddingTop: 6,
          backgroundColor: "#072146",
          borderTopColor: "#0b3758",
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: "600",
        },
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Chat" component={AskAdviceScreen} />
      <Tab.Screen name="About" component={AboutScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const user = await StorageService.getUser();
      setIsLoggedIn(!!user);
    } catch (error) {
      console.error("Error checking login status:", error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        {!isLoggedIn ? (
          // Render Login screen directly as root when not logged in
          <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />
        ) : (
          // When logged in, show the tab navigator
          <MainTabs />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
});
