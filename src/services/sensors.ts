import { Accelerometer, Gyroscope } from 'expo-sensors';

/**
 * Interface representing the structure of the combined sensor event.
 */
export interface SensorEventData {
  /** Magnitude of the acceleration vector (in g's). Baseline stationary is ~1.0g. */
  accelerationMagnitude: number;
  /** Accelerometer X-axis value. */
  x: number;
  /** Accelerometer Y-axis value. */
  y: number;
  /** Accelerometer Z-axis value. */
  z: number;
  /** Gyroscope angular velocity magnitude (in rad/s). */
  rotation: number;
}

/**
 * Sensor configuration settings containing default thresholds and intervals.
 */
export interface SensorConfig {
  /** Sensor update interval in milliseconds. */
  updateIntervalMs: number;
  /** Acceleration magnitude threshold in g's to trigger an impact (e.g. 2.5g). */
  impactThresholdG: number;
  /** Cooldown time in milliseconds to prevent double-triggering impacts. */
  impactCooldownMs: number;
  /** Acceleration deviation threshold from 1.0g to qualify as activity. */
  inactivityThresholdG: number;
  /** Angular velocity threshold in rad/s to qualify as activity. */
  inactivityGyroThreshold: number;
  /** Duration in milliseconds that sensors must remain still to trigger inactivity. */
  inactivityDurationMs: number;
}

export const DEFAULT_CONFIG: SensorConfig = {
  updateIntervalMs: 100,
  impactThresholdG: 2.5,
  impactCooldownMs: 5000,
  inactivityThresholdG: 0.08,
  inactivityGyroThreshold: 0.1,
  inactivityDurationMs: 10000,
};

let accelSubscription: { remove: () => void } | null = null;
let gyroSubscription: { remove: () => void } | null = null;

let lastAccel = { x: 0, y: 0, z: 0 };
let lastGyro = { x: 0, y: 0, z: 0 };

const callbacks: Set<(data: SensorEventData) => void> = new Set();

/**
 * Combines accelerometer and gyroscope data to broadcast a unified sensor event payload.
 */
function emitEvent(): void {
  const ax = lastAccel.x;
  const ay = lastAccel.y;
  const az = lastAccel.z;
  const accelerationMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);

  const gx = lastGyro.x;
  const gy = lastGyro.y;
  const gz = lastGyro.z;
  const rotation = Math.sqrt(gx * gx + gy * gy + gz * gz);

  const payload: SensorEventData = {
    accelerationMagnitude,
    x: ax,
    y: ay,
    z: az,
    rotation,
  };

  // console.log(`[Sensor Service] Event - Accel: ${accelerationMagnitude.toFixed(3)}g, Gyro: ${rotation.toFixed(3)} rad/s`);

  callbacks.forEach((callback) => {
    try {
      callback(payload);
    } catch (error) {
      console.error('Error in sensor event subscription callback:', error);
    }
  });
}

/**
 * Starts monitoring the device's Accelerometer and Gyroscope sensors.
 * 
 * @param updateIntervalMs - Configurable update interval in milliseconds (default: 100ms).
 */
export function startSensorMonitoring(updateIntervalMs: number = DEFAULT_CONFIG.updateIntervalMs): void {
  if (accelSubscription || gyroSubscription) {
    return; // Already monitoring
  }

  Accelerometer.setUpdateInterval(updateIntervalMs);
  Gyroscope.setUpdateInterval(updateIntervalMs);

  accelSubscription = Accelerometer.addListener((data) => {
    // console.log("[ACCEL CALLBACK FIRED]");
    // console.log("[ACCEL RAW]", data);
    lastAccel = { x: data.x, y: data.y, z: data.z };
    emitEvent();
  });
  console.log("[ACCEL LISTENER ATTACHED]");

  gyroSubscription = Gyroscope.addListener((data) => {
    // console.log("[GYRO CALLBACK FIRED]");
    // console.log("[GYRO RAW]", data);
    lastGyro = { x: data.x, y: data.y, z: data.z };
    emitEvent();
  });
  console.log("[GYRO LISTENER ATTACHED]");

  console.log("[SENSORS] Sensor subscriptions created");
}

/**
 * Stops monitoring the device's Accelerometer and Gyroscope sensors.
 */
export function stopSensorMonitoring(): void {
  console.log("[STOP SENSOR MONITORING CALLED]");
  if (accelSubscription) {
    console.log("[ACCEL LISTENER CLEANUP] Removing accelerometer listener");
    accelSubscription.remove();
    accelSubscription = null;
  }
  if (gyroSubscription) {
    console.log("[GYRO LISTENER CLEANUP] Removing gyroscope listener");
    gyroSubscription.remove();
    gyroSubscription = null;
  }
}

/**
 * Subscribes a callback to the combined sensor event stream.
 * 
 * @param callback - Function invoked on each sensor update.
 * @returns A function that unsubscribes the callback from the sensor events.
 */
export function subscribeToSensorEvents(callback: (data: SensorEventData) => void): () => void {
  callbacks.add(callback);
  return () => {
    callbacks.delete(callback);
  };
}

/**
 * Listens for high-impact/acceleration events. Triggers a callback when 
 * acceleration magnitude exceeds the specified threshold.
 * 
 * @param onImpact - Callback invoked when an impact is detected.
 * @param threshold - Optional impact threshold in g's (default: 2.5g).
 * @param cooldownMs - Optional cooldown duration in milliseconds (default: 5000ms).
 * @returns A function that unsubscribes the impact detector.
 */
export function detectImpact(
  onImpact: () => void,
  threshold: number = DEFAULT_CONFIG.impactThresholdG,
  cooldownMs: number = DEFAULT_CONFIG.impactCooldownMs
): () => void {
  let lastImpactTime = 0;

  return subscribeToSensorEvents((data) => {
    if (data.accelerationMagnitude >= threshold) {
      const now = Date.now();
      if (now - lastImpactTime >= cooldownMs) {
        lastImpactTime = now;
        console.log(`[Sensor Service] Impact detected! Magnitude: ${data.accelerationMagnitude.toFixed(3)}g (Threshold: ${threshold}g)`);
        onImpact();
      }
    }
  });
}

/**
 * Listens for prolonged user inactivity. Triggers a callback when movement
 * (acceleration deviation and angular rotation) remains below configured thresholds 
 * for a specified duration.
 * 
 * @param onInactivity - Callback invoked when inactivity is detected.
 * @param inactivityThresholdG - Optional acceleration deviation threshold (default: 0.08g).
 * @param inactivityDurationMs - Optional inactivity duration in milliseconds (default: 10000ms).
 * @returns A function that unsubscribes the inactivity detector.
 */
export function detectInactivity(
  onInactivity: () => void,
  inactivityThresholdG: number = DEFAULT_CONFIG.inactivityThresholdG,
  inactivityDurationMs: number = DEFAULT_CONFIG.inactivityDurationMs
): () => void {
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

  const resetTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    inactivityTimer = setTimeout(() => {
      console.log(`[Sensor Service] Inactivity detected! Stillness duration exceeded ${inactivityDurationMs}ms`);
      onInactivity();
    }, inactivityDurationMs);
  };

  // Start the timer initially
  resetTimer();

  const unsubscribe = subscribeToSensorEvents((data) => {
    const accelDeviation = Math.abs(data.accelerationMagnitude - 1.0);
    const gyroMagnitude = data.rotation;

    // Active if deviation from gravity is above threshold OR rotation rate is above threshold
    const isActive = accelDeviation > inactivityThresholdG || gyroMagnitude > DEFAULT_CONFIG.inactivityGyroThreshold;

    if (isActive) {
      resetTimer();
    }
  });

  return () => {
    unsubscribe();
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
  };
}
