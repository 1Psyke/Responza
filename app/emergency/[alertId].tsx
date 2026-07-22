import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Linking, 
  Share, 
  Platform, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
// @ts-ignore
import Ionicons from '@expo/vector-icons/Ionicons';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence 
} from 'react-native-reanimated';
import { db, auth } from '../../src/services/firebase';

export default function EmergencyAlertDetails() {
  const { alertId } = useLocalSearchParams<{ alertId: string }>();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Alert and Sender data
  const [alert, setAlert] = useState<any>(null);
  const [sender, setSender] = useState<any>(null);
  
  // Time elapsed calculator state
  const [timeElapsed, setTimeElapsed] = useState('');
  
  // Radar/Pulse animation values
  const pulse = useSharedValue(1);
  const mapPulse = useSharedValue(1);

  // Setup animations
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      true
    );
    mapPulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );
  }, [mapPulse, pulse]);

  const badgePulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 1.4 - pulse.value,
  }));

  const mapPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mapPulse.value }],
    opacity: 1.2 - mapPulse.value,
  }));

  // Ref to hold alert listener unsubscribe function
  const unsubscribeAlertRef = useRef<(() => void) | null>(null);

  // Fetch alert details and setup live listener
  useEffect(() => {
    if (!alertId) {
      setError('Invalid Alert ID.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Wait for Firebase Auth initialization/restoration to complete
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Clean up any existing alert listener
      if (unsubscribeAlertRef.current) {
        unsubscribeAlertRef.current();
        unsubscribeAlertRef.current = null;
      }

      if (!user) {
        console.warn(`[EMERGENCY DIAGNOSTICS] Auth check failed on mount. currentUser is null.`);
        setError('Permission denied. Please log in to view emergency details.');
        setLoading(false);
        return;
      }

      // 1. Before Firestore: Log Auth State & Routes
      console.log('=== [EMERGENCY DIAGNOSTICS: BEFORE FIRESTORE] ===');
      console.log(`- alertId: "${alertId}"`);
      console.log(`- current authenticated UID: "${user.uid}"`);
      console.log(`- current user phone: "${user.phoneNumber || 'N/A'}"`);
      console.log(`- current user email: "${user.email || 'N/A'}"`);
      console.log(`- current route: "/emergency/${alertId}"`);
      console.log('==================================================');

      const alertDocRef = doc(db, 'alerts', alertId);
      
      // 2. Firestore Read: Log setup
      console.log(`[EMERGENCY DIAGNOSTICS] Reading document: "alerts/${alertId}"`);

      // Live Firestore update sync
      const unsubscribeAlert = onSnapshot(
        alertDocRef,
        (alertSnap) => {
          if (!alertSnap.exists()) {
            console.warn(`[EMERGENCY DIAGNOSTICS] Document does not exist for ID: ${alertId}`);
            setError('Unable to load emergency information. Alert no longer exists.');
            setLoading(false);
            return;
          }

          const alertData = alertSnap.data();
          
          // Log entire document & fields
          console.log('=== [EMERGENCY DIAGNOSTICS: SNAPSHOT SUCCESS] ===');
          console.log('Full Document Data:', JSON.stringify(alertData, null, 2));
          console.log(`- uid (Owner): "${alertData.uid}"`);
          console.log(`- recipientUids:`, alertData.recipientUids || []);
          console.log(`- senderName: "${alertData.senderName || 'N/A'}"`);
          console.log(`- senderPhone: "${alertData.senderPhone || 'N/A'}"`);
          console.log(`- status: "${alertData.status}"`);
          console.log('=================================================');

          setAlert(alertData);

          // Derive sender profile details from the self-contained alert document
          setSender({
            name: alertData.senderName || 'A User',
            phone: alertData.senderPhone || '',
            medicalInfo: alertData.senderMedicalInfo || null,
            emergencyNote: alertData.senderEmergencyNote || ''
          });

          setLoading(false);
        },
        (err: any) => {
          // 3. Firestore Errors: Log complete details
          console.error('=== [EMERGENCY DIAGNOSTICS: SNAPSHOT ERROR] ===');
          console.error('Code:', err.code);
          console.error('Message:', err.message);
          console.error('Stack:', err.stack || 'N/A');
          console.error('Complete Error Object:', JSON.stringify(err, null, 2));
          console.error('===============================================');

          // 4. Permission Verification Checks
          if (err.code === 'permission-denied') {
            console.error('=== [EMERGENCY DIAGNOSTICS: PERMISSION VERIFICATION] ===');
            console.error(`- Current Auth UID: "${user.uid}"`);
            console.error(`- Alert Owner UID: [Inaccessible due to permission-denied]`);
            console.error(`- recipientUids: [Inaccessible due to permission-denied]`);
            console.error(`- Rule expected: Current user in recipientUids? [Cannot evaluate on client]`);
            console.error('=========================================================');
          }

          setError(`Firestore Read Failed:\nCode: ${err.code || 'unknown'}\nMessage: ${err.message || 'No message'}`);
          setLoading(false);
        }
      );

      unsubscribeAlertRef.current = unsubscribeAlert;
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeAlertRef.current) {
        unsubscribeAlertRef.current();
      }
    };
  }, [alertId]);

  // Handle dynamic elapsed time updates
  useEffect(() => {
    if (!alert || !alert.createdAt) return;

    const calculateElapsed = () => {
      // Firebase Timestamp conversion
      const sentTime = alert.createdAt.toDate ? alert.createdAt.toDate() : new Date(alert.createdAt);
      const diffMs = Date.now() - sentTime.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor(diffMs / 1000);

      if (diffMins < 1) {
        setTimeElapsed(diffSecs <= 5 ? 'Just now' : `${diffSecs} seconds ago`);
      } else if (diffMins === 1) {
        setTimeElapsed('1 minute ago');
      } else {
        setTimeElapsed(`${diffMins} minutes ago`);
      }
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 10000); // refresh every 10s

    return () => clearInterval(interval);
  }, [alert]);

  const handleCall = () => {
    if (sender?.phone) {
      Linking.openURL(`tel:${sender.phone}`);
    }
  };

  const handleSMS = () => {
    if (sender?.phone) {
      Linking.openURL(`sms:${sender.phone}&body=I saw your emergency alert. Are you okay? I am on my way.`);
    }
  };

  const handleOpenMap = () => {
    if (alert?.location) {
      const { latitude, longitude } = alert.location;
      const url = Platform.select({
        ios: `maps://?q=${latitude},${longitude}`,
        android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
        default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      });
      Linking.openURL(url);
    }
  };

  const handleNavigate = () => {
    if (alert?.location) {
      const { latitude, longitude } = alert.location;
      const url = Platform.select({
        ios: `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`,
        android: `google.navigation:q=${latitude},${longitude}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
      });
      Linking.openURL(url);
    }
  };

  const handleShare = () => {
    if (alert && sender) {
      const name = sender.name || 'User';
      const lat = alert.location?.latitude || 'N/A';
      const lng = alert.location?.longitude || 'N/A';
      const mapsUrl = alert.location?.mapLink || `https://maps.google.com/?q=${lat},${lng}`;
      
      const message = `🚨 EMERGENCY ALERT DETAIL:\n\n${name} has triggered an SOS alert.\nLocation: ${lat}, ${lng}\nGoogle Maps: ${mapsUrl}\nAlert Status: ${alert.status.toUpperCase()}`;
      
      Share.share({
        message,
        title: `Responza Alert: ${name}`
      });
    }
  };

  const renderStatusBadge = () => {
    const status = alert?.status || 'active';
    let label = 'ACTIVE';
    let color = '#ff3b30'; // Red
    
    if (status === 'resolved') {
      label = 'RESOLVED';
      color = '#34c759'; // Green
    } else if (status === 'cancelled') {
      label = 'CANCELLED';
      color = '#8e8e93'; // Grey
    }

    return (
      <View style={styles.badgeContainer}>
        {status === 'active' && (
          <Animated.View style={[styles.pulseCircle, badgePulseStyle, { backgroundColor: color }]} />
        )}
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>
      </View>
    );
  };

  const formatEmergencyType = (type: string) => {
    switch (type) {
      case 'manual_sos':
        return 'Manual SOS Trigger';
      case 'fall_detection':
        return 'Fall Detection Trigger';
      default:
        return 'Emergency SOS';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#ff3b30" />
        <Text style={styles.loadingText}>Loading alert details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !alert) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <View style={styles.errorBox}>
          <Ionicons name="warning" size={64} color="#ff3b30" />
          <Text style={styles.errorTitle}>Error Loading Alert</Text>
          <Text style={styles.errorSubtitle}>{error || 'Unable to load emergency information.'}</Text>
          
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              if (!auth.currentUser) {
                router.replace('/login' as any);
              } else {
                setLoading(true);
                // Re-trigger layout mount hook
                setError(null);
                const alertDocRef = doc(db, 'alerts', alertId || '');
                getDoc(alertDocRef)
                  .then((snap) => {
                    if (snap.exists()) {
                      const alertData = snap.data();
                      setAlert(alertData);
                      setSender({
                        name: alertData.senderName || 'A User',
                        phone: alertData.senderPhone || '',
                        medicalInfo: alertData.senderMedicalInfo || null,
                        emergencyNote: alertData.senderEmergencyNote || ''
                      });
                      setError(null);
                    } else {
                      setError('Unable to load emergency information. Alert no longer exists.');
                    }
                    setLoading(false);
                  })
                  .catch(() => {
                    setError('Unable to load emergency information. Connection or permission failed.');
                    setLoading(false);
                  });
              }
            }}
          >
            <Text style={styles.retryText}>{!auth.currentUser ? 'Login' : 'Retry'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.replace('/home' as any)}
          >
            <Text style={styles.backText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const hasMedicalInfo = 
    sender?.medicalInfo?.bloodType || 
    sender?.medicalInfo?.allergies || 
    sender?.medicalInfo?.conditions || 
    sender?.emergencyNote ||
    alert?.cancelReason; // Show cancellation reason if exists

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Alert Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="alert-circle" size={42} color="#ffffff" />
          </View>
          <Text style={styles.headerTitle}>🚨 Emergency Alert</Text>
          <Text style={styles.senderName}>{sender?.name || 'A User'}</Text>
          <Text style={styles.headerSubtitle}>Needs Immediate Assistance</Text>
          
          {renderStatusBadge()}
        </View>

        {/* Quick Contacts Bar */}
        <View style={styles.contactsBar}>
          <TouchableOpacity style={[styles.contactButton, styles.callBtn]} onPress={handleCall}>
            <Ionicons name="call" size={24} color="#ffffff" />
            <Text style={styles.contactBtnText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.contactButton, styles.smsBtn]} onPress={handleSMS}>
            <Ionicons name="chatbox" size={24} color="#ffffff" />
            <Text style={styles.contactBtnText}>Message</Text>
          </TouchableOpacity>
        </View>

        {/* Location Card */}
        {alert.location ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location" size={22} color="#ff3b30" />
              <Text style={styles.cardTitle}>Current Location</Text>
            </View>
            <View style={styles.mapContainer}>
              {/* Radar Loop Layout Mock */}
              <View style={styles.radarFrame}>
                <Animated.View style={[styles.radarCircle, mapPulseStyle]} />
                <View style={styles.radarDot}>
                  <Ionicons name="radio" size={32} color="#ff3b30" />
                </View>
              </View>
              <View style={styles.coordsBox}>
                <Text style={styles.coordLabel}>Latitude:</Text>
                <Text style={styles.coordValue}>{alert.location.latitude.toFixed(6)}</Text>
                <Text style={styles.coordLabel}>Longitude:</Text>
                <Text style={styles.coordValue}>{alert.location.longitude.toFixed(6)}</Text>
              </View>
            </View>
            <View style={styles.mapActions}>
              <TouchableOpacity style={styles.mapButton} onPress={handleOpenMap}>
                <Ionicons name="map" size={18} color="#ffffff" />
                <Text style={styles.mapButtonText}>View Map</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mapButton, styles.navButton]} onPress={handleNavigate}>
                <Ionicons name="navigate" size={18} color="#ffffff" />
                <Text style={styles.mapButtonText}>Navigate</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location" size={22} color="#ff3b30" />
              <Text style={styles.cardTitle}>Current Location</Text>
            </View>
            <Text style={styles.infoText}>GPS location is not available for this alert.</Text>
          </View>
        )}

        {/* Alert Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="list" size={22} color="#ff9500" />
            <Text style={styles.cardTitle}>Alert Information</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Trigger Type:</Text>
            <Text style={styles.detailValue}>{formatEmergencyType(alert.type)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time Sent:</Text>
            <Text style={styles.detailValue}>
              {alert.createdAt?.toDate ? alert.createdAt.toDate().toLocaleTimeString() : 'Unknown'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time Elapsed:</Text>
            <Text style={[styles.detailValue, { color: '#ff3b30', fontWeight: 'bold' }]}>
              {timeElapsed}
            </Text>
          </View>
          {alert.cancelReason && (
            <View style={[styles.detailRow, { marginTop: 10, borderTopWidth: 1, borderTopColor: '#232836', paddingTop: 10 }]}>
              <Text style={styles.detailLabel}>Reason Info:</Text>
              <Text style={styles.detailValue}>{alert.cancelReason}</Text>
            </View>
          )}
        </View>

        {/* Medical Card */}
        {hasMedicalInfo && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="medical" size={22} color="#ff3b30" />
              <Text style={styles.cardTitle}>Medical & Emergency Notes</Text>
            </View>
            {sender?.medicalInfo?.bloodType && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Blood Group:</Text>
                <Text style={[styles.detailValue, styles.bloodText]}>
                  {sender.medicalInfo.bloodType}
                </Text>
              </View>
            )}
            {sender?.medicalInfo?.allergies && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Allergies:</Text>
                <Text style={styles.detailValue}>{sender.medicalInfo.allergies}</Text>
              </View>
            )}
            {sender?.medicalInfo?.conditions && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Conditions:</Text>
                <Text style={styles.detailValue}>{sender.medicalInfo.conditions}</Text>
              </View>
            )}
            {sender?.emergencyNote && (
              <View style={styles.noteBox}>
                <Text style={styles.noteTitle}>Emergency Instructions:</Text>
                <Text style={styles.noteBody}>{sender.emergencyNote}</Text>
              </View>
            )}
          </View>
        )}

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-social" size={20} color="#ffffff" />
          <Text style={styles.shareButtonText}>Share Emergency Details</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1015',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#8e8e93',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#1d1014',
    borderWidth: 1.5,
    borderColor: '#3a181c',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  headerIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  senderName: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#8e8e93',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  badgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 50,
    zIndex: 2,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  pulseCircle: {
    position: 'absolute',
    width: 120,
    height: 40,
    borderRadius: 20,
    zIndex: 1,
  },
  contactsBar: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  callBtn: {
    backgroundColor: '#34c759',
  },
  smsBtn: {
    backgroundColor: '#007aff',
  },
  contactBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#161922',
    borderWidth: 1,
    borderColor: '#232836',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#232836',
    paddingBottom: 10,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  mapContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1015',
    borderRadius: 16,
    padding: 12,
    gap: 16,
  },
  radarFrame: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#181215',
    borderWidth: 1,
    borderColor: '#3a181c',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  radarCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: '#ff3b30',
  },
  radarDot: {
    zIndex: 2,
  },
  coordsBox: {
    flex: 1,
    gap: 4,
  },
  coordLabel: {
    color: '#8e8e93',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  coordValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'CourierNewPSMT', android: 'monospace' }),
  },
  mapActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  mapButton: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    backgroundColor: '#232836',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  navButton: {
    backgroundColor: '#ff3b30',
  },
  mapButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '600',
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  infoText: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
  bloodText: {
    color: '#ff3b30',
    fontWeight: '800',
  },
  noteBox: {
    backgroundColor: '#201618',
    borderColor: '#3a181c',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  noteTitle: {
    color: '#ff3b30',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  noteBody: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  shareButton: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#232836',
    borderWidth: 1,
    borderColor: '#32394c',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  errorBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    color: '#8e8e93',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  retryButton: {
    height: 50,
    width: '80%',
    backgroundColor: '#ff3b30',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    height: 50,
    width: '80%',
    backgroundColor: '#232836',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
