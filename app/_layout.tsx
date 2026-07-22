import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // 1. Handle notification open when app is in background/foreground
    const unsubscribeNotificationOpen = messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('[FCM] Notification opened app from background:', remoteMessage);
      const alertId = remoteMessage.data?.alertId;
      if (alertId) {
        // Set deep link flag to bypass splash screen redirect
        (global as any).isEmergencyDeepLinkActive = true;
        setTimeout(() => {
          router.push(`/emergency/${alertId}` as any);
        }, 300);
      }
    });

    // 2. Check if the app was opened from a terminated state via a notification
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('[FCM] Initial notification opened app:', remoteMessage);
          const alertId = remoteMessage.data?.alertId;
          if (alertId) {
            (global as any).isEmergencyDeepLinkActive = true;
            setTimeout(() => {
              router.push(`/emergency/${alertId}` as any);
            }, 800); // Wait for Expo Router hydration
          }
        }
      });

    return () => {
      unsubscribeNotificationOpen();
    };
  }, [router]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="permissions" />
        <Stack.Screen name="home" />
        <Stack.Screen name="contacts" />
        <Stack.Screen name="add-contact" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="phone" />
        <Stack.Screen name="medical-info" />
        <Stack.Screen name="emergency-note" />
        <Stack.Screen name="cancel-codes" />
        <Stack.Screen name="countdown" />
        <Stack.Screen name="pin-cancel" />
        <Stack.Screen name="cancelled-feedback" />
        <Stack.Screen name="cancelled-success" />
        <Stack.Screen name="active-alert" />
        <Stack.Screen name="history" />
        <Stack.Screen name="emergency/[alertId]" />
      </Stack>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
