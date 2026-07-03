import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

const messaging = getMessaging();

// Register background message handler for Firebase Cloud Messaging
setBackgroundMessageHandler(messaging, async (remoteMessage) => {
  console.log('[FCM Background] Message ID:', remoteMessage.messageId);
  console.log('[FCM Background] Notification Title:', remoteMessage.notification?.title);
  console.log('[FCM Background] Notification Body:', remoteMessage.notification?.body);
});

import 'expo-router/entry';
