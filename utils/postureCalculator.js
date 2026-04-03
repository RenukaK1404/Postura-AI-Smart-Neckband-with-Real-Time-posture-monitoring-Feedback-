// utils/postureCalculator.js
// Simplified version: only checks posture and thresholds (no roll/pitch calculation)

const PITCH_FORWARD_THRESHOLD = 25;     // Forward bend (chin toward chest)
const PITCH_BACKWARD_THRESHOLD = -15;   // Backward bend (looking upward)
const ROLL_THRESHOLD = 20;              // Side tilt (left/right)
const ABNORMAL_DURATION = 120000;       // 2 minutes (for continuous abnormal check)

/**
 * Check if posture is abnormal based on roll and pitch from ESP32
 */
export const isAbnormalPosture = (pitch, roll) => {
  const abnormalPitch = (pitch > PITCH_FORWARD_THRESHOLD || pitch < PITCH_BACKWARD_THRESHOLD);
  const abnormalRoll = Math.abs(roll) > ROLL_THRESHOLD;
  return abnormalPitch || abnormalRoll;
};

/**
 * Get posture status text (for safety if ESP32 doesn’t send it)
 */
export const getPostureStatus = (pitch, roll) => {
  return isAbnormalPosture(pitch, roll) ? "ABNORMAL" : "NORMAL";
};

/**
 * Get thresholds (for visualization or debugging)
 */
export const getThresholds = () => ({
  PITCH_FORWARD_THRESHOLD,
  PITCH_BACKWARD_THRESHOLD,
  ROLL_THRESHOLD,
  ABNORMAL_DURATION,
});
