# PostureMonitor – AI-Powered Smart Posture Detection and Advisory System
A real-time IoT-based wearable device integrated with BLE communication for posture monitoring. Incorporates intelligent AI algorithms for classification and **personalized health feedback**.

## Introduction:
The PostureMonitor system is a smart, **AI-assisted posture detection device** designed to identify improper body alignment and promote ergonomic health. It employs an **ESP32-WROOM microcontroller** integrated with an **MPU6050** accelerometer and gyroscope sensor to acquire real-time body orientation data. Using trigonometric computations, the device determines pitch and roll angles, classifying posture as normal or abnormal. When incorrect posture is detected, dual **vibration motors** are triggered to alert the user through **haptic feedback**. The device establishes wireless communication via **Bluetooth Low Energy (BLE)** to a React Native mobile application, which visualizes posture data and provides **AI-generated health recommendations**. This combination of IoT and AI technologies ensures an efficient, affordable, and user-friendly system for continuous posture monitoring and wellness improvement.

Built for AI-centric software innovation, it combines:
- Embedded sensing (ESP32 + MPU6050)
- Real-time BLE data transmission
- On-device AI classification (Decision Tree)
- Generative AI voice advisory (GPT-4o mini)

## Objectives:
- To design and develop an IoT-enabled posture detection system using ESP32 and MPU6050 sensors for real-time angle computation.
- To implement BLE-based wireless communication for seamless data transfer between hardware and the mobile dashboard.
- To integrate AI-based algorithms for posture classification and deliver personalized feedback to users, promoting long-term ergonomic health.

## SYSTEM ARCHITECTURE
**HARDWARE COMPONENTS AND INTEGRATION:**
 1. **ESP32 (Microcontroller Unit)** is the Core computing and BLE communication hub that reads IMU sensor data, computes inclination angles, and transmits to mobile.
 2. **MPU6050 (6-axis IMU)** is used for measures neck orientation (pitch, roll, yaw) and also detects slouching or forward head posture.
 3. **Coin Vibration Motor** provides gentle haptic feedback for posture correction.
 4. **Power Source** a 500 mAh **Li-Po battery** supports long-duration operation.
 5. **Enclosure** is done by **3D-printing using TPU 95A** for flexible, lightweight, and comfortable wear.

**SOFTWARE & AI MODULES**
 1. **Mobile App (React Native)** for managing BLE connection, visualizing posture metrics, and sending voice alerts. React native is known for its capability to run AI models locally for privacy and offline use.
 2. **Bluetooth Low Energy (BLE)** supports real-time low-power communication between ESP32 and smartphone.
 3. **Decision Tree Classifier (Edge ML)** classifies posture into: Neutral, Forward Tilt, or Slouched and is trained offline using scikit-learn and embedded into the app for runtime inference.
 4. **GPT-4o mini (Embedded LLM)** generates personalized feedback messages and adaptive motivational cues and enables natural **“AI coach”** conversations like ***“You’ve improved posture by 15% this week.”***
 5. Notification & Voice Layer offers a local push alerts for posture deviation and provides text-to-speech guidance such as ***“Please correct your posture and sit straight.”***

<img width="1800" height="1200" alt="process flow diagram" src="https://github.com/user-attachments/assets/48884802-3c1a-4ef2-84cf-f9334312daca" />
Fig. 1: Implementation plan

## Role of Artificial Intelligence
- **Decision Tree Model** predicts posture from IMU readings with >90% accuracy.
- **GPT-4o mini (LLM)** acts as an empathetic posture assistant generating natural language responses.
- **Adaptive Intelligence** learns user behavior patterns to modify thresholds dynamically.
      This synergy between classical ML and generative AI transforms PostureMonitor from a simple sensor device into an interactive digital wellness coach.

  ## Technical Stack
- **Hardware:** ESP32, MPU6050, Vibration Motor, Li-Po Battery, TPU 95A Enclosure
- **Firmware:** Arduino IDE (C++), BLE GATT Server for data transmission
- **Mobile App:** React Native, BLE-PLX, Text-to-Speech (TTS), Push Notifications
- **AI/ML:** Scikit-learn Decision Tree (Python trained, JS inference), GPT-4o mini integration

**DATA  FLOW: IMU → ESP32 → BLE → React Native App → AI Advisory → User Feedback**
