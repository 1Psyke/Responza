import { useRouter } from 'expo-router';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-ignore
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../constants/theme';
import { getCurrentUserProfile, getCurrentUser } from '../src/services/auth';
import { getContacts, Contact } from '../src/services/contacts';
import { useIsFocused } from '@react-navigation/native';
import { createAlert } from '../src/services/alerts';
import { getLocationPayload } from '../src/services/location';
import { startEmergencyDetection, stopEmergencyDetection } from '../src/services/detection';
import { registerDeviceTokenWithBackend, setupTokenRefreshListener, setupForegroundListener } from '../src/services/fcm';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Home Dashboard Screen
 * Displays monitoring status, status of sensors, trusted contacts, and an interactive hold-to-test SOS button.
 * Includes a simulated bottom navigation bar matching the Figma layout.
 */
export default function HomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [isSOSHolding, setIsSOSHolding] = useState(false);
  const [activeTab, setActiveTab] = useState('Home');
  const [userName, setUserName] = useState('User');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const isTriggeringAlertRef = useRef(false);
  const fcmRegisteredRef = useRef(false);

  const handleEmergencyTrigger = useCallback(async (triggerType: string) => {
    if (isTriggeringAlertRef.current) return;
    isTriggeringAlertRef.current = true;

    try {
      const user = getCurrentUser();
      if (!user) {
        isTriggeringAlertRef.current = false;
        return;
      }

      // Fetch location payload
      let location = null;
      try {
        location = await getLocationPayload();
      } catch (locErr) {
        console.error('Failed to get location payload:', locErr);
      }

      // Fetch active trusted contacts
      let activeContacts: any[] = [];
      try {
        const list = await getContacts(user.uid);
        activeContacts = list.filter(c => c.enabled);
      } catch (contactsErr) {
        console.error('Failed to get contacts:', contactsErr);
      }

      // Create alert document in Firestore
      const alertDoc = await createAlert(user.uid, triggerType, activeContacts, location);

      // Navigate to Countdown Screen
      router.push(`/countdown?alertId=${alertDoc.id}` as any);
    } catch (err: any) {
      console.error('Automated emergency trigger failure:', err);
      Alert.alert('Emergency Error', 'Failed to trigger emergency alert: ' + (err?.message || err));
    } finally {
      isTriggeringAlertRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    if (!isFocused) {
      stopEmergencyDetection();
      return;
    }

    console.log("[HOME] Starting emergency detection");
    startEmergencyDetection({
      onFallDetected: () => {
        console.log('Automated detection: Fall detected');
        handleEmergencyTrigger('fall_detection');
      },
      onImpactDetected: () => {
        console.log('Automated detection: Impact detected');
        handleEmergencyTrigger('fall_detection');
      }
    });
    console.log("[HOME] Detection callback registered");

    return () => {
      stopEmergencyDetection();
    };
  }, [isFocused, handleEmergencyTrigger]);

  useEffect(() => {
    if (!isFocused) return;

    let isMounted = true;
    let unsubscribeRefresh: (() => void) | null = null;
    let unsubscribeForeground: (() => void) | null = null;
    const fetchData = async () => {
      try {
        // Onboarding guard check
        const completed = await AsyncStorage.getItem('responza_onboarding_completed');
        if (completed !== 'true') {
          if (isMounted) {
            router.replace('/permissions' as any);
          }
          return;
        }

        const user = getCurrentUser();
        if (!user) return;

        // Fetch user profile name
        const profile = await getCurrentUserProfile();
        if (profile && profile.name && isMounted) {
          setUserName(profile.name);
        }



        // Register FCM device token in background (only once per session) and setup listeners
        try {
          if (!fcmRegisteredRef.current) {
            fcmRegisteredRef.current = true;
            await registerDeviceTokenWithBackend(user.uid);
          }
          if (isMounted) {
            unsubscribeRefresh = setupTokenRefreshListener(user.uid);
            unsubscribeForeground = setupForegroundListener();
          }
        } catch (fcmErr) {
          console.error('[HOME] Failed to register FCM push notifications:', fcmErr);
        }

        const list = await getContacts(user.uid);
        if (isMounted) {
          // Limit to max 5 dynamic contacts on dashboard
          setContacts(list.slice(0, 5));
        }
      } catch (err) {
        console.error('[HOME] Error loading dashboard data:', err);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      if (unsubscribeRefresh) {
        unsubscribeRefresh();
      }
      if (unsubscribeForeground) {
        unsubscribeForeground();
      }
    };
  }, [isFocused, router]);

  const handleSOSPressIn = () => {
    setIsSOSHolding(true);
  };

  const handleSOSPressOut = () => {
    setIsSOSHolding(false);
  };

  const handleSOSLongPress = async () => {
    try {
      const user = getCurrentUser();
      if (!user) {
        Alert.alert('Authentication Error', 'Please log in to trigger an SOS.');
        router.replace('/login' as any);
        return;
      }

      // Fetch location payload
      let location = null;
      try {
        location = await getLocationPayload();
      } catch (locErr) {
        console.error('Failed to get location payload:', locErr);
      }

      // Fetch active trusted contacts
      let activeContacts: any[] = [];
      try {
        const list = await getContacts(user.uid);
        activeContacts = list.filter(c => c.enabled);
      } catch (contactsErr) {
        console.error('Failed to get contacts:', contactsErr);
      }

      // Create alert document in Firestore
      const alertDoc = await createAlert(user.uid, 'manual_sos', activeContacts, location);

      // Navigate to Countdown Screen
      router.push(`/countdown?alertId=${alertDoc.id}` as any);
    } catch (err: any) {
      console.error('SOS trigger failure:', err);
      Alert.alert('SOS Error', 'Failed to trigger emergency alert: ' + (err?.message || err));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Greeting */}
        <Text style={styles.greeting}>Hi, {userName}</Text>

        {/* Monitoring Active Card */}
        <View style={styles.monitoringCard}>
          <Text style={styles.monitoringText}>MONITORING ACTIVE</Text>
        </View>

        {/* Sensors Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SENSORS</Text>
          <View style={styles.row}>
            <View style={styles.dashedPill}>
              <Text style={styles.pillText}>accel </Text>
              <Ionicons name="checkmark" size={16} color={Colors.light.text} />
            </View>
            <View style={styles.dashedPill}>
              <Text style={styles.pillText}>gyro </Text>
              <Ionicons name="checkmark" size={16} color={Colors.light.text} />
            </View>
            <View style={styles.dashedPill}>
              <Text style={styles.pillText}>GPS </Text>
              <Ionicons name="checkmark" size={16} color={Colors.light.text} />
            </View>
          </View>
        </View>

        {/* Trusted Contacts Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>TRUSTED</Text>
          <View style={styles.row}>
            {contacts.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                activeOpacity={0.7}
                style={[
                  styles.dashedPill,
                  !contact.enabled && { opacity: 0.5, backgroundColor: Colors.light.greyLight }
                ]}
                onPress={() => router.push('/contacts' as any)}
              >
                <Text style={[
                  styles.pillText,
                  !contact.enabled && { color: Colors.light.textSecondary }
                ]}>
                  {contact.relationship.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}

            {contacts.length < 5 && (
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.dashedPill, styles.addPill]}
                onPress={() => router.push('/add-contact' as any)}
              >
                <Text style={styles.pillText}>+</Text>
              </TouchableOpacity>
            )}

            {contacts.length === 0 && (
              <Text style={styles.emptyStateText}>No trusted contacts. Tap + to add.</Text>
            )}
          </View>
        </View>

        {/* HOLD TO TEST SOS Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPressIn={handleSOSPressIn}
          onPressOut={handleSOSPressOut}
          onLongPress={handleSOSLongPress}
          delayLongPress={1500} // Requires holding for 1.5s
          style={[styles.sosButton, isSOSHolding && styles.sosButtonActive]}
        >
          <Text style={styles.sosButtonText}>
            {isSOSHolding ? "HOLDING..." : "HOLD TO TEST SOS"}
          </Text>
        </TouchableOpacity>

        {/* Debug Log out button to return to Splash */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => router.replace('/' as any)}
        >
          <Text style={styles.logoutText}>Return to Splash (Debug)</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Simulated Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Home')}
        >
          <Ionicons
            name="home"
            size={24}
            color={activeTab === 'Home' ? Colors.light.accent : Colors.light.text}
          />
          <Text style={[styles.tabLabel, activeTab === 'Home' && styles.tabLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            router.push('/contacts' as any);
          }}
        >
          <Ionicons
            name="call-outline"
            size={24}
            color={Colors.light.text}
          />
          <Text style={styles.tabLabel}>Contacts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            router.push('/history' as any);
          }}
        >
          <Ionicons
            name="time-outline"
            size={24}
            color={Colors.light.text}
          />
          <Text style={styles.tabLabel}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            router.push('/profile' as any);
          }}
        >
          <Ionicons
            name="person-outline"
            size={24}
            color={Colors.light.text}
          />
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 100, // Safe padding for bottom navigation bar
    alignItems: 'center',
  },
  greeting: {
    fontSize: 34,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  monitoringCard: {
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 20,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  monitoringText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 22,
    padding: 20,
    width: '100%',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dashedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: Colors.light.cardBackground,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  addPill: {
    minWidth: 44,
    justifyContent: 'center',
  },
  sosButton: {
    backgroundColor: Colors.light.primary,
    height: 60,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 15,
  },
  sosButtonActive: {
    backgroundColor: Colors.light.accent,
  },
  sosButtonText: {
    color: Colors.light.primaryText,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logoutButton: {
    marginTop: 30,
    padding: 10,
  },
  logoutText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
    fontWeight: '500',
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
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 4,
  },
  tabLabelActive: {
    color: Colors.light.accent,
  },
});
