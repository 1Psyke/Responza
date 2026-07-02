import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  SafeAreaView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Alert, 
  TextInput,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
// @ts-ignore
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../constants/theme';
import { getProfile } from '../src/services/profile';
import { cancelAlert, resolveAlert } from '../src/services/alerts';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../src/services/firebase';
import { sendAlertNotifications } from '../src/services/fcm';

export default function PinCancelScreen() {
  const router = useRouter();
  const { alertId, from } = useLocalSearchParams<{ alertId: string; from?: string }>();
  const [pin, setPin] = useState('');
  const [timeLeft, setTimeLeft] = useState(8);
  const [safePin, setSafePin] = useState('');
  const [distressPin, setDistressPin] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const textInputRef = useRef<TextInput | null>(null);
  const timerRef = useRef<any>(null);

  const triggerAlertActive = useCallback(async () => {
    if (!alertId) return;
    try {
      const docRef = doc(db, 'alerts', alertId);
      await updateDoc(docRef, { status: 'active' });
      try {
        await sendAlertNotifications(alertId);
      } catch (notiErr) {
        console.error('Failed to send push notifications:', notiErr);
      }
    } catch (err) {
      console.error('Failed to update alert state to active:', err);
    }
  }, [alertId]);

  useEffect(() => {
    let isMounted = true;
    const fetchUserPins = async () => {
      try {
        const profile = await getProfile();
        if (profile && isMounted) {
          setSafePin(profile.safePin || '');
          setDistressPin(profile.distressPin || '');
        }
        setLoadingProfile(false);
      } catch (err) {
        console.error('Failed to load user pins:', err);
        setLoadingProfile(false);
      }
    };

    fetchUserPins();

    // Auto-focus input
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);

    // Ticking timer only if coming from countdown (pending alert)
    if (from === 'countdown') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            // Timeout -> Alert becomes active in database
            triggerAlertActive();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [from, triggerAlertActive]);

  const handleSubmit = async () => {
    if (pin.length < 4) {
      Alert.alert('Validation Error', 'Please enter a 4-digit PIN.');
      return;
    }

    if (loadingProfile) {
      Alert.alert('Loading', 'Checking profile settings, please try again.');
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    try {
      if (pin === safePin) {
        // Safe PIN -> Real cancellation or resolution
        if (from === 'active') {
          // If already active, resolve it
          await resolveAlert(alertId);
        } else {
          // Otherwise cancel it
          await cancelAlert(alertId, 'Safe PIN disarmed');
        }
        router.replace(`/cancelled-feedback?alertId=${alertId}&disarmType=safe` as any);
      } else if (pin === distressPin) {
        // Distress PIN -> Duress trigger!
        // We do NOT cancel the alert. We activate it if it was pending
        const docRef = doc(db, 'alerts', alertId);
        await updateDoc(docRef, { status: 'active' });
        
        try {
          await sendAlertNotifications(alertId);
        } catch (notiErr) {
          console.error('Failed to send push notifications on distress PIN:', notiErr);
        }
        
        // Navigate anyway pretending it was cancelled
        router.replace(`/cancelled-feedback?alertId=${alertId}&disarmType=distress` as any);
      } else {
        Alert.alert('Error', 'Invalid PIN code. Please try again.');
        setPin('');
        // Re-focus keyboard
        textInputRef.current?.focus();
      }
    } catch (err: any) {
      console.error('PIN submission error:', err);
      Alert.alert('Error', 'Failed to process cancel codes: ' + (err?.message || err));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity 
        style={styles.keyboardDismiss}
        activeOpacity={1}
        onPress={() => textInputRef.current?.focus()}
      >
        <View style={styles.content}>
          {/* Header */}
          <Text style={styles.headerTitle}>Enter PIN to cancel</Text>

          {/* Subtitle timer if pending */}
          {from === 'countdown' && timeLeft > 0 ? (
            <Text style={styles.timerSubtitle}>
              Contacts will be notified in 00:0{timeLeft} unless cancelled.
            </Text>
          ) : from === 'countdown' ? (
            <Text style={[styles.timerSubtitle, { color: Colors.light.accent }]}>
              Contacts have been notified. PIN still required to resolve sharing.
            </Text>
          ) : (
            <Text style={styles.timerSubtitle}>
              Enter Safe PIN to resolve emergency and stop sharing.
            </Text>
          )}

          {/* Circular PIN Fields */}
          <View style={styles.pinContainer}>
            {[0, 1, 2, 3].map((index) => {
              const hasDigit = pin.length > index;
              return (
                <View 
                  key={index} 
                  style={[
                    styles.pinBubble, 
                    hasDigit && styles.pinBubbleFilled
                  ]} 
                />
              );
            })}
          </View>

          {/* Hidden input to receive keyboard input */}
          <TextInput
            ref={textInputRef}
            style={styles.hiddenInput}
            value={pin}
            onChangeText={(text) => {
              // Only allow numeric 4-digits
              const cleaned = text.replace(/[^0-9]/g, '');
              if (cleaned.length <= 4) {
                setPin(cleaned);
              }
            }}
            keyboardType="number-pad"
            maxLength={4}
            onSubmitEditing={handleSubmit}
            autoFocus
          />

          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={16} color={Colors.light.textSecondary} />
            <Text style={styles.warningText}>Never share your code.</Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, pin.length < 4 && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={pin.length < 4}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Simulated Tab Bar */}
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
  keyboardDismiss: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  timerSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 20,
    paddingHorizontal: 15,
  },
  pinContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 30,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: '100%',
    justifyContent: 'center',
  },
  pinBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    backgroundColor: '#FFFFFF',
  },
  pinBubbleFilled: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  hiddenInput: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginBottom: 40,
  },
  warningText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: Colors.light.primary,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: Colors.light.primaryText,
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
