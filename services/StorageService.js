// services/StorageService.js
import AsyncStorage from "@react-native-async-storage/async-storage";

const HISTORY_KEY = "@posture_history";
const USER_KEY = "@user_data";
const MAX_HISTORY_ITEMS = 500;

class StorageService {
  // Save sensor reading to history
  async saveReading(reading) {
    try {
      // Get existing history
      const history = await this.getHistory();

      // Add new reading at the beginning
      history.unshift(reading);

      // Keep only last MAX_HISTORY_ITEMS
      if (history.length > MAX_HISTORY_ITEMS) {
        history.length = MAX_HISTORY_ITEMS;
      }

      // Save back to storage
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      return true;
    } catch (error) {
      console.error("❌ Error saving reading:", error);
      return false;
    }
  }

  // Get all history
  async getHistory() {
    try {
      const data = await AsyncStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("❌ Error getting history:", error);
      return [];
    }
  }

  // Clear all history
  async clearHistory() {
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
      return true;
    } catch (error) {
      console.error("❌ Error clearing history:", error);
      return false;
    }
  }

  // Get history for specific date
  async getHistoryByDate(date) {
    try {
      const history = await this.getHistory();
      const targetDate = new Date(date).toDateString();

      return history.filter((item) => {
        const itemDate = new Date(item.timestamp).toDateString();
        return itemDate === targetDate;
      });
    } catch (error) {
      console.error("❌ Error filtering history:", error);
      return [];
    }
  }

  // Get statistics
  async getStatistics() {
    try {
      const history = await this.getHistory();

      if (history.length === 0) {
        return {
          totalReadings: 0,
          normalCount: 0,
          abnormalCount: 0,
          averageTilt: 0,
        };
      }

      const normalCount = history.filter((r) => r.status === "NORMAL").length;
      const abnormalCount = history.filter(
        (r) => r.status === "ABNORMAL"
      ).length;
      const averageTilt =
        history.reduce((sum, r) => sum + r.tiltAngle, 0) / history.length;

      return {
        totalReadings: history.length,
        normalCount,
        abnormalCount,
        averageTilt: averageTilt.toFixed(2),
      };
    } catch (error) {
      console.error("❌ Error getting statistics:", error);
      return null;
    }
  }

  // Save user data (login)
  async saveUser(userData) {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error("❌ Error saving user:", error);
      return false;
    }
  }

  // Get user data
  async getUser() {
    try {
      const data = await AsyncStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("❌ Error getting user:", error);
      return null;
    }
  }

  // Logout user
  async logout() {
    try {
      await AsyncStorage.removeItem(USER_KEY);
      return true;
    } catch (error) {
      console.error("❌ Error logging out:", error);
      return false;
    }
  }

  // Ensure a test user exists. If no user is saved, create a default test account.
  async ensureTestUser() {
    try {
      const existing = await this.getUser();
      if (!existing) {
        const testUser = { email: "test@example.com", password: "test123" };
        await this.saveUser(testUser);
        return true; // created
      }
      return false; // already exists
    } catch (error) {
      console.error("❌ Error ensuring test user:", error);
      return false;
    }
  }
}

export default new StorageService();
