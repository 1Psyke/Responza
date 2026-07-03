import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Alert, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
// @ts-ignore
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../constants/theme';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../src/services/firebase';
import { sendAlertNotifications } from '../src/services/fcm';

export default function CountdownScreen() {
  const router = useRouter();
  const { alertId } = useLocalSearchParams<{ alertId: string }>();
  const [timeLeft, setTimeLeft] = useState(10);
  const timerRef = useRef<any>(null);

  const activateAlert = useCallback(async () => {
    try {
      const docRef = doc(db, 'alerts', alertId);
      await updateDoc(docRef, {
        status: 'active'
      });
      try {
        await sendAlertNotifications(alertId);
      } catch (notiErr) {
        console.error('Failed to send push notifications:', notiErr);
      }
      router.replace(`/active-alert?alertId=${alertId}` as any);
    } catch (err) {
      console.error('Failed to activate alert on timeout:', err);
      // Fallback redirect anyway
      router.replace(`/active-alert?alertId=${alertId}` as any);
    }
  }, [alertId, router]);

  useEffect(() => {
    if (!alertId) {
      Alert.alert('Error', 'Invalid Alert ID.');
      router.replace('/home' as any);
      return;
    }

    // Start timer countdown
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          activateAlert();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [alertId, activateAlert, router]);

  const handleSendNow = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    await activateAlert();
  };

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    router.push(`/pin-cancel?alertId=${alertId}&from=countdown` as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Block */}
        <View style={styles.alertHeader}>
          <Text style={styles.alertHeaderText}>EMERGENCY DETECTED</Text>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>We noticed a sudden impact. Tap to confirm you&apos;re okay</Text>

        {/* Circle Countdown */}
        <View style={styles.circleOuter}>
          <View style={styles.circleInner}>
            <Text style={styles.countdownNumber}>{timeLeft}</Text>
          </View>
        </View>

        <Text style={styles.sendingText}>Sending alert in seconds...</Text>

        {/* Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            style={styles.sendButton} 
            onPress={handleSendNow}
            activeOpacity={0.8}
          >
            <Text style={styles.sendButtonText}>SEND ALERT NOW</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>I&apos;M OK — CANCEL</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Simulated Tab Bar matching UI mockups */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/home' as any)}>
          <Ionicons name="home-outline" size={24} color={Colors.light.text} />
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/contacts' as any)}>
          <Ionicons name="call-outline" size={24} color={Colors.light.text} />
          <Text style={styles.tabLabel}>Contacts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/history' as any)}>
          <Ionicons name="time-outline" size={24} color={Colors.light.text} />
          <Text style={styles.tabLabel}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/profile' as any)}>
          <Ionicons name="person-outline" size={24} color={Colors.light.text} />
          <Text style={styles.tabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  alertHeader: {
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  alertHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  circleOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  circleInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000000',
  },
  sendingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
    marginBottom: 40,
  },
  buttonGroup: {
    width: '100%',
    gap: 16,
  },
  sendButton: {
    backgroundColor: Colors.light.primary,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  sendButtonText: {
    color: Colors.light.primaryText,
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  cancelButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
    backgroundColor: Colors.light.cardBackground,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 15 : 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    flex: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 4,
  },
});
