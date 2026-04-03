import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

let OPENROUTER_API_KEY =
  "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";
try {
  const secret = require("../config/secret");
  if (secret && secret.OPENROUTER_API_KEY) {
    OPENROUTER_API_KEY = secret.OPENROUTER_API_KEY;
  }
} catch (e) {}

const MODEL = "gpt-4o-mini";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const AskAdviceScreen = () => {
  const [messages, setMessages] = useState([
    {
      id: "1",
      text: "Hello! I'm your posture health assistant. Ask me anything about maintaining good posture, exercises, or health tips.",
      isUser: false,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    if (OPENROUTER_API_KEY === "YOUR_OPENROUTER_API_KEY_HERE") {
      Alert.alert(
        "API Key Missing",
        "Please add your OpenRouter API key in AskAdviceScreen.js file. Get it from: https://openrouter.ai/keys"
      );
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await axios.post(
        OPENROUTER_API_URL,
        {
          model: MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful posture and health assistant. Keep responses short (3–4 sentences) and friendly.",
            },
            ...messages.map((msg) => ({
              role: msg.isUser ? "user" : "assistant",
              content: msg.text,
            })),
            {
              role: "user",
              content: inputText,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://your-app-name.example",
            "Content-Type": "application/json",
          },
        }
      );

      const aiText =
        response.data?.choices?.[0]?.message?.content ||
        "Sorry, I could not generate a response. Please try again.";

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: aiText,
        isUser: false,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error(
        "OpenRouter API Error:",
        error.response?.data || error.message
      );

      const errorMsg = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I encountered an error. Please check your OpenRouter API key or internet connection.",
        isUser: false,
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageContainer,
        item.isUser ? styles.userMessage : styles.aiMessage,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          item.isUser ? styles.userText : styles.aiText,
        ]}
      >
        {item.text}
      </Text>
    </View>
  );

  const quickQuestions = [
    "How can I improve my posture?",
    "What exercises help neck pain?",
    "Tips for sitting at a desk?",
    "How often should I take breaks?",
  ];

  const handleQuickQuestion = (question) => {
    setInputText(question);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
        <Text style={styles.subtitle}>Powered by OpenRouter AI</Text>
      </View>

      {messages.length === 1 && (
        <View style={styles.quickQuestionsContainer}>
          <Text style={styles.quickQuestionsTitle}>Quick Questions</Text>
          {quickQuestions.map((question, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickQuestionButton}
              onPress={() => handleQuickQuestion(question)}
            >
              <Text style={styles.quickQuestionText}>{question}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2196F3" />
          <Text style={styles.loadingText}>Thinking...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask about posture health..."
          placeholderTextColor="#9fd7b3"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// same styles as before ...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#071729" },
  header: { backgroundColor: "#072146", padding: 18, paddingBottom: 14 },
  title: { fontSize: 22, fontWeight: "700", color: "#e6f7ef" },
  subtitle: { fontSize: 12, color: "#9fd7b3", marginTop: 6 },
  quickQuestionsContainer: { padding: 12, backgroundColor: "#0f2b3b" },
  quickQuestionsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#e6f7ef",
    marginBottom: 10,
  },
  quickQuestionButton: {
    backgroundColor: "#072a38",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#144d2b",
  },
  quickQuestionText: { color: "#9fd7b3", fontSize: 14 },
  messagesList: { padding: 15, paddingBottom: 10 },
  messageContainer: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  userMessage: { alignSelf: "flex-end", backgroundColor: "#144d2b" },
  aiMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#0f2b3b",
    borderWidth: 1,
    borderColor: "#203a4a",
  },
  messageText: { fontSize: 15, lineHeight: 20, color: "#e6f7ef" },
  userText: { color: "#e6f7ef" },
  aiText: { color: "#cfeee0" },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    paddingLeft: 15,
  },
  loadingText: { marginLeft: 10, color: "#9fd7b3", fontSize: 14 },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#072146",
    borderTopWidth: 1,
    borderTopColor: "#0b3758",
  },
  input: {
    flex: 1,
    backgroundColor: "#0f2b3b",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 15,
    color: "#e6f7ef",
  },
  sendButton: {
    backgroundColor: "#144d2b",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: "center",
  },
  sendButtonDisabled: { backgroundColor: "#203a4a" },
  sendButtonText: { color: "#e6f7ef", fontWeight: "700", fontSize: 15 },
});

export default AskAdviceScreen;
