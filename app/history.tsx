import React, { useState, useEffect } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  ActivityIndicator, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../constants/theme';
import { getCurrentUser } from '../src/services/auth';
import { getUserAlerts, AlertDocument } from '../src/services/alerts';
import { useIsFocused } from '@react-navigation/native';

export default function HistoryScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [alerts, setAlerts] = useState<AlertDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFocused) return;

    let isMounted = true;
    const fetchAlertHistory = async () => {
      try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
          router.replace('/login' as any);
          return;
        }

        const list = await getUserAlerts(currentUser.uid);
        if (isMounted) {
          setAlerts(list);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load alert history:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAlertHistory();

    return () => {
      isMounted = false;
    };
  }, [isFocused, router]);

  const formatAlertTime = (timestamp: any) => {
    if (!timestamp) return 'Unknown time';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    // Check if it is today
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();

    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    
    if (isToday) {
      return `Today ${timeString}`;
    } else {
      const dateString = date.toLocaleDateString([], { month: 'short', day: '2-digit' });
      return `${dateString} ${timeString}`;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'manual_sos':
        return 'TEST ALERT';
      case 'fall_detection':
        return 'FALL DETECTED';
      case 'low_battery':
        return 'LOW BATTERY WARNING';
      case 'inactivity':
        return 'INACTIVITY';
      default:
        return (type || 'ALERT').toUpperCase();
    }
  };

  const getStatusLabel = (status: string) => {
    // Map status active/pending/cancelled/resolved to UI labels
    if (status === 'active') return 'sent';
    return status;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.replace('/home' as any)}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History Log</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <Text style={styles.pageTitle}>HISTORY</Text>
        <Text style={styles.pageSubtitle}>
          Track previous emergency alerts and how they were resolved.
        </Text>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.light.accent} />
          </View>
        ) : alerts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color={Colors.light.placeholder} />
            <Text style={styles.emptyText}>No emergency logs found.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {alerts.map((alert) => {
              const displayStatus = getStatusLabel(alert.status);
              return (
                <View key={alert.id} style={styles.historyCard}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>
                      {getAlertTypeLabel(alert.type)}
                    </Text>
                    <Text style={styles.cardTime}>
                      {formatAlertTime(alert.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.badgeContainer}>
                    <View style={styles.statusBadge}>
                      <Text style={styles.badgeText}>{displayStatus}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

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

        <TouchableOpacity style={styles.tabItem} onPress={() => {}}>
          <Ionicons name="time" size={24} color={Colors.light.accent} />
          <Text style={[styles.tabLabel, styles.tabLabelActive]}>History</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: Colors.light.background,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 100, // safety spacing for bottom tab bar
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    marginBottom: 30,
  },
  loaderContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 22,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  listContainer: {
    width: '100%',
    gap: 16,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  cardTime: {
    fontSize: 12,
    color: Colors.light.placeholder,
    fontWeight: '600',
  },
  badgeContainer: {
    justifyContent: 'center',
  },
  statusBadge: {
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
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
  tabLabelActive: {
    color: Colors.light.accent,
  },
});
