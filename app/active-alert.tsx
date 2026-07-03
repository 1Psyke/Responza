import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Alert, 
  Platform,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
// @ts-ignore
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../constants/theme';
import { getAlertById, AlertDocument } from '../src/services/alerts';

export default function ActiveAlertScreen() {
  const router = useRouter();
  const { alertId } = useLocalSearchParams<{ alertId: string }>();
  const [alertData, setAlertData] = useState<AlertDocument | null>(null);
  const [timeAgo, setTimeAgo] = useState('00:00 ago');
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!alertId) {
      router.replace('/home' as any);
      return;
    }

    const fetchAlert = async () => {
      try {
        const docData = await getAlertById(alertId);
        if (docData) {
          setAlertData(docData);
          updateTimer(docData.createdAt);
        }
      } catch (err) {
        console.error('Failed to get alert data:', err);
      }
    };

    fetchAlert();

    // Set up timer to update "time ago" every 10 seconds
    timerRef.current = setInterval(() => {
      if (alertData?.createdAt) {
        updateTimer(alertData.createdAt);
      } else {
        // Fallback fetch if not loaded yet
        fetchAlert();
      }
    }, 10000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [alertId, alertData?.createdAt, router]);

  const updateTimer = (createdAt: any) => {
    if (!createdAt) return;
    
    // Firestore Timestamp conversion
    const createdMs = createdAt.seconds ? createdAt.seconds * 1000 : Date.now();
    const diffMs = Date.now() - createdMs;
    
    const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;
    
    const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
    
    setTimeAgo(`${formattedMinutes}:${formattedSeconds} ago`);
  };

  const handleCall112 = () => {
    Alert.alert(
      'Simulating Call',
      'Initiating emergency call to 112. (Simulation)',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => {
            Linking.openURL('tel:112').catch((err) => {
              console.error('Failed to make call:', err);
              Alert.alert('Simulated Call', 'Calling 112 now...');
            });
          } 
        }
      ]
    );
  };

  const handleStopSharing = () => {
    router.push(`/pin-cancel?alertId=${alertId}&from=active` as any);
  };

  const handleOpenMap = () => {
    if (alertData?.location?.mapLink) {
      Linking.openURL(alertData.location.mapLink).catch((err) => {
        console.error('Failed to open maps link:', err);
      });
    } else {
      Alert.alert('Location unavailable', 'No coordinates saved for this alert.');
    }
  };

  // Compile contacts list string
  const getContactsString = () => {
    if (!alertData?.contacts || alertData.contacts.length === 0) {
      return 'No active contacts';
    }
    return alertData.contacts.map((c: any) => c.name || c.relationship).join(', ');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Auto Detected Banner */}
        <View style={styles.autoDetectedBanner}>
          <Text style={styles.bannerText}>AUTO-DETECTED</Text>
        </View>

        {/* Warning instructions */}
        <Text style={styles.subtitle}>
          We noticed a sudden impact. Tap to confirm you&apos;re okay
        </Text>
        
        <Text style={styles.sendingText}>Sending alert in seconds...</Text>

        {/* Simulated Map / Coordinates Card */}
        <TouchableOpacity 
          style={styles.mapCard}
          onPress={handleOpenMap}
          activeOpacity={0.9}
        >
          <View style={styles.mapBackground}>
            <Ionicons name="map-outline" size={48} color="#8E8E93" />
            <Text style={styles.mapText}>GPS Location Sharing Active</Text>
            {alertData?.location ? (
              <View style={styles.coordBox}>
                <Text style={styles.coordText}>Lat: {alertData.location.latitude.toFixed(5)}</Text>
                <Text style={styles.coordText}>Lng: {alertData.location.longitude.toFixed(5)}</Text>
              </View>
            ) : (
              <Text style={styles.coordText}>Fetching GPS coordinates...</Text>
            )}
            <Text style={styles.mapLinkText}>Tap to open in Google Maps</Text>
          </View>
        </TouchableOpacity>

        {/* Live status badge */}
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE · ALERT ACTIVE</Text>
        </View>

        {/* Notification details */}
        <Text style={styles.sentDetail}>
          Sent to {getContactsString()} · {timeAgo}
        </Text>

        {/* Bottom Actions */}
        <View style={styles.rowActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.whiteBtn]} 
            onPress={handleCall112}
            activeOpacity={0.8}
          >
            <Text style={styles.whiteBtnText}>CALL 112</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.whiteBtn]} 
            onPress={handleStopSharing}
            activeOpacity={0.8}
          >
            <Text style={styles.whiteBtnText}>STOP SHARING</Text>
          </TouchableOpacity>
        </View>
      </View>

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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  autoDetectedBanner: {
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  bannerText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.accent,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
    paddingHorizontal: 15,
  },
  sendingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
    marginBottom: 20,
  },
  mapCard: {
    backgroundColor: '#E5E5EA',
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 22,
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  mapBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#E5E5EA',
  },
  mapText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginTop: 12,
    marginBottom: 8,
  },
  coordBox: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  coordText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  mapLinkText: {
    fontSize: 12,
    color: Colors.light.link,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F2',
    borderWidth: 1.5,
    borderColor: Colors.light.accent,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.accent,
    marginRight: 8,
  },
  liveText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.accent,
  },
  sentDetail: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 30,
  },
  rowActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  whiteBtn: {
    backgroundColor: '#FFFFFF',
  },
  whiteBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
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
