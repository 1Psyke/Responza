import React, { useState, useEffect } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Alert, 
  ActivityIndicator, 
  Platform,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../constants/theme';
import { getCurrentUser } from '../src/services/auth';
import { getContacts, deleteContact, toggleContact, Contact } from '../src/services/contacts';
import { useIsFocused } from '@react-navigation/native';
import { Button } from '../components/Button';

export default function ContactsScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    if (!isFocused) return;

    let isMounted = true;
    const loadContacts = async () => {
      try {
        const user = getCurrentUser();
        if (!user) {
          Alert.alert('Session Expired', 'Please log in to manage your contacts.');
          router.replace('/login' as any);
          return;
        }
        setUid(user.uid);
        const list = await getContacts(user.uid);
        if (isMounted) {
          setContacts(list);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load contacts:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadContacts();

    return () => {
      isMounted = false;
    };
  }, [isFocused, router]);

  const handleToggle = async (contactId: string, currentEnabled: boolean) => {
    if (!uid) return;
    const newEnabled = !currentEnabled;

    // Optimistic UI update
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, enabled: newEnabled } : c));

    try {
      await toggleContact(uid, contactId, newEnabled);
    } catch (error) {
      console.error('Failed to toggle contact:', error);
      Alert.alert('Error', 'Failed to update contact status. Please try again.');
      // Revert status on failure
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, enabled: currentEnabled } : c));
    }
  };

  const handleDelete = (contactId: string, contactName: string) => {
    if (!uid) return;

    Alert.alert(
      'Delete Contact',
      `Are you sure you want to remove ${contactName} from your trusted contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Optimistic UI update
            const originalContacts = [...contacts];
            setContacts(prev => prev.filter(c => c.id !== contactId));

            try {
              await deleteContact(uid, contactId);
            } catch (error) {
              console.error('Failed to delete contact:', error);
              Alert.alert('Error', 'Failed to delete contact. Please try again.');
              setContacts(originalContacts);
            }
          }
        }
      ]
    );
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
        <Text style={styles.headerTitle}>Trusted Contacts</Text>
        {contacts.length < 5 ? (
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => router.push('/add-contact' as any)}
          >
            <Ionicons name="add" size={24} color={Colors.light.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholderButton} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.light.accent} />
          </View>
        ) : contacts.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <View style={styles.shieldIconContainer}>
              <Ionicons name="shield-checkmark-outline" size={80} color={Colors.light.accent} />
            </View>
            <Text style={styles.emptyTitle}>Secure Your Network</Text>
            <Text style={styles.emptyText}>
              Add up to 5 trusted contacts who will be immediately notified with your location when you trigger an SOS.
            </Text>
            <Button 
              title="Add Trusted Contact" 
              onPress={() => router.push('/add-contact' as any)} 
            />
          </View>
        ) : (
          /* Dynamic Contacts List */
          <View style={styles.listContainer}>
            {/* Status Counter */}
            <View style={styles.counterBanner}>
              <Text style={styles.counterText}>
                {contacts.length} / 5 Trusted Contacts
              </Text>
              {contacts.length >= 5 && (
                <Text style={styles.limitWarning}>Limit Reached</Text>
              )}
            </View>

            {contacts.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.cardInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {contact.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.details}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{contact.relationship.toLowerCase()}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  {/* Status Toggle Switch */}
                  <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>
                      {contact.enabled ? 'Active' : 'Disabled'}
                    </Text>
                    <Switch
                      value={contact.enabled}
                      onValueChange={() => handleToggle(contact.id, contact.enabled)}
                      trackColor={{ false: '#D1D1D6', true: Colors.light.accent }}
                      thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                    />
                  </View>

                  {/* Delete Button */}
                  <TouchableOpacity 
                    style={styles.deleteButton} 
                    onPress={() => handleDelete(contact.id, contact.name)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={20} color="#E22D2D" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {contacts.length < 5 && (
              <TouchableOpacity 
                style={styles.dashedAddCard}
                onPress={() => router.push('/add-contact' as any)}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={28} color={Colors.light.accent} />
                <Text style={styles.dashedAddText}>Add Another Contact</Text>
              </TouchableOpacity>
            )}
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
          onPress={() => {}}
        >
          <Ionicons name="call" size={24} color={Colors.light.accent} />
          <Text style={[styles.tabLabel, styles.tabLabelActive]}>Contacts</Text>
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
          onPress={() => router.push('/profile' as any)}
        >
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
  addButton: {
    padding: 8,
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
  emptyContainer: {
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 22,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  shieldIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  listContainer: {
    width: '100%',
  },
  counterBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  counterText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  limitWarning: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.accent,
    backgroundColor: '#FFF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.accent,
  },
  contactCard: {
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  details: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#FFF2F2',
  },
  dashedAddCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    gap: 8,
    marginBottom: 16,
  },
  dashedAddText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
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
