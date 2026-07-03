import React, { useState, useEffect } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Alert, 
  ActivityIndicator, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../constants/theme';
import { getProfile, signOutUser, UserProfile } from '../src/services/profile';
import { useIsFocused } from '@react-navigation/native';
import { Button } from '../components/Button';
import { auth } from '../src/services/firebase';

export default function ProfileScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!isFocused) return;

    let isMounted = true;
    const fetchProfileData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          router.replace('/login' as any);
          return;
        }
        setEmail(currentUser.email || '');
        const data = await getProfile();
        if (isMounted) {
          setProfile(data);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProfileData();

    return () => {
      isMounted = false;
    };
  }, [isFocused, router]);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOutUser();
              router.replace('/login' as any);
            } catch (error) {
              console.error('Failed to sign out:', error);
              Alert.alert('Sign Out Error', 'Failed to log out. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.replace('/home' as any)}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Settings</Text>
        <View style={styles.placeholderButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.light.accent} />
          </View>
        ) : (
          <View style={styles.contentContainer}>
            {/* User Info Header Card */}
            <View style={styles.profileHeaderCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(profile?.name || '')}
                </Text>
              </View>
              <Text style={styles.userName}>{profile?.name || 'User'}</Text>
              <Text style={styles.userEmail}>{email}</Text>

              {/* Plan Badge */}
              <View style={styles.planBadge}>
                <Ionicons name="sparkles" size={14} color="#D4AF37" style={styles.planIcon} />
                <Text style={styles.planText}>
                  {(profile?.subscription || 'Free').toUpperCase()} PLAN
                </Text>
              </View>
            </View>

            {/* Menu Options Group */}
            <View style={styles.menuGroup}>
              {/* Option: Medical Info */}
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/medical-info' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#FFF2F2' }]}>
                    <Ionicons name="medical-outline" size={22} color={Colors.light.accent} />
                  </View>
                  <Text style={styles.menuText}>Medical Info</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.light.placeholder} />
              </TouchableOpacity>

              {/* Option: Emergency Note */}
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/emergency-note' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#EBF3FF' }]}>
                    <Ionicons name="document-text-outline" size={22} color={Colors.light.link} />
                  </View>
                  <Text style={styles.menuText}>Emergency Note</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.light.placeholder} />
              </TouchableOpacity>

              {/* Option: Secret Cancel Codes */}
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/cancel-codes' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#F2F2F7' }]}>
                    <Ionicons name="key-outline" size={22} color={Colors.light.text} />
                  </View>
                  <Text style={styles.menuText}>Secret Cancel Codes</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.light.placeholder} />
              </TouchableOpacity>

              {/* Option: Phone Number */}
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/phone' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#EAFDF5' }]}>
                    <Ionicons name="call-outline" size={22} color="#10B981" />
                  </View>
                  <Text style={styles.menuText}>Phone Number</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.light.placeholder} />
              </TouchableOpacity>
            </View>

            {/* Sign Out Button */}
            <View style={styles.buttonContainer}>
              <Button title="Sign Out" onPress={handleSignOut} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.replace('/home' as any)}
        >
          <Ionicons name="home-outline" size={24} color={Colors.light.text} />
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push('/contacts' as any)}
        >
          <Ionicons name="call-outline" size={24} color={Colors.light.text} />
          <Text style={styles.tabLabel}>Contacts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push('/history' as any)}
        >
          <Ionicons name="time-outline" size={24} color={Colors.light.text} />
          <Text style={styles.tabLabel}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {}}
        >
          <Ionicons name="person" size={24} color={Colors.light.accent} />
          <Text style={[styles.tabLabel, styles.tabLabelActive]}>Profile</Text>
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
  placeholderButton: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 100, // safety spacing for bottom tab bar
  },
  loaderContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    width: '100%',
  },
  profileHeaderCard: {
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  planIcon: {
    marginRight: 6,
  },
  planText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B78103',
  },
  menuGroup: {
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 22,
    paddingVertical: 8,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
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
