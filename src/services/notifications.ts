import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { doc, updateDoc, arrayUnion, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getAlertById } from './alerts';
import { getContacts } from './contacts';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests push notification permissions and registers the Expo Push Token in Firestore.
 * 
 * @param uid - The currently logged-in user's UID.
 * @returns The registered token string or null if failed.
 */
export async function registerForPushNotificationsAsync(uid: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notification Service] Permission not granted for push notifications.');
      return null;
    }

    // EAS Project ID is required to get the push token in Expo SDK 54
    const projectId = 
      Constants.expoConfig?.extra?.eas?.projectId ?? 
      Constants.easConfig?.projectId ??
      '6d9539d0-ea65-4f30-8be0-b5bf08d25d6b';

    if (!projectId) {
      console.warn('[Notification Service] Project ID is unavailable. Push registration skipped.');
      return null;
    }

    let token = null;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      token = tokenData.data;
    } catch (tokenErr) {
      console.error('[Notification Service] Failed to retrieve Expo Push Token:', tokenErr);
      return null;
    }

    console.log('[Notification Service] Registered Expo Push Token:', token);

    // Save token to users/{uid} document under the expoPushTokens array
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      expoPushTokens: arrayUnion(token)
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  } catch (error) {
    console.error('[Notification Service] Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Sends client-side Expo push notifications to all enabled contacts of an alert.
 * 
 * @param alertId - The ID of the active alert.
 */
export async function sendAlertNotifications(alertId: string): Promise<void> {
  console.log('[Notification Service] Initiating sendAlertNotifications for alertId:', alertId);

  try {
    const alertDoc = await getAlertById(alertId);
    if (!alertDoc) {
      console.error(`[Notification Service] Alert not found for ID: ${alertId}`);
      return;
    }
    console.log('[Notification Service] Retrieved alert document successfully:', alertDoc);

    // Fetch the name of the user who triggered the alert
    const userDocRef = doc(db, 'users', alertDoc.uid);
    const userDocSnap = await getDoc(userDocRef);
    const userData = userDocSnap.exists() ? userDocSnap.data() : null;
    const userName = userData?.name || 'Someone';
    console.log('[Notification Service] Retrieved alert initiator profile name:', userName);

    // Determine target contacts: fallback to current contacts list if alert.contacts is empty
    let contactsToNotify = alertDoc.contacts || [];
    if (contactsToNotify.length === 0) {
      console.log('[Notification Service] Alert contacts array empty. Fetching current contacts from DB.');
      contactsToNotify = await getContacts(alertDoc.uid);
    }

    const enabledContacts = contactsToNotify.filter((c: any) => c.enabled);
    console.log(`[Notification Service] Found ${enabledContacts.length} enabled contacts out of ${contactsToNotify.length} total contacts.`);

    if (enabledContacts.length === 0) {
      console.log('[Notification Service] No enabled contacts to notify.');
      return;
    }

    // Collect push tokens of the users who match the contact phone numbers
    const pushTokens: string[] = [];
    const usersCollectionRef = collection(db, 'users');

    for (const contact of enabledContacts) {
      const normalizedPhone = contact.phone;
      console.log(`[Notification Service] Contact Lookup: Querying User for contact phone: ${normalizedPhone} (${contact.name})`);
      
      const q = query(usersCollectionRef, where('phone', '==', normalizedPhone));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log(`[Notification Service] Contact Lookup: No registered user found for phone: ${normalizedPhone}`);
      } else {
        querySnapshot.forEach((docSnap) => {
          const matchedUser = docSnap.data();
          // Read expoPushTokens, fallback to fcmTokens
          const tokens = matchedUser.expoPushTokens || matchedUser.fcmTokens || [];
          console.log(`[Notification Service] Contact Lookup: Found user "${matchedUser.name}" with tokens:`, tokens);
          if (Array.isArray(tokens)) {
            for (const t of tokens) {
              if (t && typeof t === 'string' && !pushTokens.includes(t)) {
                pushTokens.push(t);
              }
            }
          }
        });
      }
    }

    if (pushTokens.length === 0) {
      console.log('[Notification Service] No recipient Expo push tokens found for enabled contacts.');
      return;
    }

    console.log('[Notification Service] Total unique recipient push tokens:', pushTokens);

    // Build payload
    const lat = alertDoc.location?.latitude;
    const lng = alertDoc.location?.longitude;
    const mapsLink = alertDoc.location?.mapLink || (lat && lng ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : 'No location available');
    
    // Format timestamp nicely
    let timestampStr = new Date().toLocaleString();
    if (alertDoc.createdAt) {
      if (typeof alertDoc.createdAt.toDate === 'function') {
        timestampStr = alertDoc.createdAt.toDate().toLocaleString();
      } else if (alertDoc.createdAt.seconds) {
        timestampStr = new Date(alertDoc.createdAt.seconds * 1000).toLocaleString();
      }
    }

    const messages = pushTokens.map((token) => ({
      to: token,
      sound: 'default',
      title: `Responza Emergency Alert: ${userName}`,
      body: `${userName} has triggered a ${alertDoc.type === 'manual_sos' ? 'Manual SOS' : alertDoc.type} alert. Location: ${mapsLink}`,
      data: {
        userName,
        alertType: alertDoc.type,
        alertTimestamp: timestampStr,
        mapsLink,
        alertId: alertDoc.id
      }
    }));

    console.log('[Notification Service] Sending push notification payload:', JSON.stringify(messages, null, 2));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messages)
    });

    const responseBody = await response.json();
    console.log('[Notification Service] Expo API Response status:', response.status);
    console.log('[Notification Service] Expo API Response body:', JSON.stringify(responseBody, null, 2));

  } catch (error) {
    console.error('[Notification Service] Error sending alert notifications:', error);
  }
}
