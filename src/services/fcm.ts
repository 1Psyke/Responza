import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { getBackendRoute } from '../config/api';

/**
 * Requests user notification permission.
 * @returns boolean indicating if permission is granted
 */
export async function requestUserPermission(): Promise<boolean> {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log('[FCM] Permission status:', authStatus);
    return enabled;
  } catch (error) {
    console.error('[FCM] Permission request failed:', error);
    return false;
  }
}

/**
 * Obtains the FCM registration token for the device.
 * @returns FCM token string or null if failed
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const hasPermission = await requestUserPermission();
    if (!hasPermission) {
      console.warn('[FCM] Notification permissions denied. Cannot fetch token.');
      return null;
    }
    
    const token = await messaging().getToken();
    console.log('[FCM] Generated FCM Token:', token);
    return token;
  } catch (error) {
    console.error('[FCM] Token generation failed:', error);
    return null;
  }
}

/**
 * Registers the device FCM token with the backend.
 * Tries local machine network IP, emulator loopback, and localhost.
 * 
 * @param uid - The currently authenticated Firebase user's ID
 * @returns boolean indicating registration success
 */
export async function registerDeviceTokenWithBackend(uid: string): Promise<boolean> {
  try {
    console.log('[FCM] Starting backend registration for Firebase User UID:', uid);
    
    const fcmToken = await getFCMToken();
    if (!fcmToken) {
      console.warn('[FCM] No FCM token generated. Skipping backend registration.');
      return false;
    }

    // Force platform to lowercase string as required by backend ('android')
    const platform = Platform.OS === 'android' ? 'android' : 'android';

    const payload = {
      uid,
      fcmToken,
      platform
    };

    console.log('[FCM] Sending registration payload to backend:', JSON.stringify(payload, null, 2));

    // Define server addresses dynamically
    const urls = getBackendRoute('/api/device/register');

    let lastError = null;
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[FCM] Backend registration success at ${url}:`, data);
          return true;
        } else {
          const errText = await response.text();
          console.warn(`[FCM] Backend returned non-2xx status at ${url}: ${response.status}`, errText);
          lastError = new Error(`Status ${response.status}: ${errText}`);
        }
      } catch (fetchErr: any) {
        console.warn(`[FCM] Failed to connect to backend at ${url}:`, fetchErr.message);
        lastError = fetchErr;
      }
    }

    throw lastError || new Error('All backend registration endpoints failed');
  } catch (error) {
    console.error('[FCM] Backend token registration failed gracefully:', error);
    return false;
  }
}

/**
 * Subscribes to token refresh events and uploads the new token automatically.
 * @param uid - The currently authenticated Firebase user's ID
 * @returns unsubscribe function
 */
export function setupTokenRefreshListener(uid: string): () => void {
  const unsubscribe = messaging().onTokenRefresh(async (token) => {
    console.log('[FCM] Token refreshed:', token);
    try {
      const platform = Platform.OS === 'android' ? 'android' : 'android';
      const payload = {
        uid,
        fcmToken: token,
        platform
      };

      const urls = getBackendRoute('/api/device/register');

      for (const url of urls) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          if (response.ok) {
            console.log(`[FCM] Token refresh backend registration successful at ${url}`);
            break;
          }
        } catch (err: any) {
          console.warn(`[FCM] Token refresh update failed at ${url}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[FCM] Token refresh callback failed:', err);
    }
  });

  return unsubscribe;
}

/**
 * Triggers alert notifications.
 * Since we are migrating to Firebase Cloud Messaging (FCM) and the backend will handle
 * the actual sending in the next phase, this is a placeholder/stub for now.
 * 
 * @param alertId - The ID of the active alert
 */
export async function sendAlertNotifications(alertId: string): Promise<void> {
  console.log('[FCM] sendAlertNotifications triggered for alertId:', alertId);
  console.log('[FCM] Actual notification dispatch will be handled by the backend in the next phase.');
}

