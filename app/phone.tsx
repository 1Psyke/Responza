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
import { getProfile, updatePhone } from '../src/services/profile';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export default function PhoneScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchPhoneData = async () => {
      try {
        const profile = await getProfile();
        if (profile && isMounted) {
          if (profile.phone) {
            setPhoneNumber(profile.phone);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load profile phone:', error);
        Alert.alert('Error', 'Failed to load phone number.');
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPhoneData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number.');
      return;
    }

    setSaving(true);
    try {
      await updatePhone(phoneNumber);
      setSaving(false);
      Alert.alert(
        'Success',
        'Your phone number has been updated successfully!',
        [{ text: 'OK', onPress: () => router.replace('/profile' as any) }]
      );
    } catch (error: any) {
      console.error('Failed to update phone number:', error);
      setSaving(false);
      const errorMessage = error?.message || 'Failed to update phone number. Please try again.';
      Alert.alert('Save Error', errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          disabled={saving}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phone Number</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.light.accent} />
          </View>
        ) : (
          <View style={styles.contentContainer}>
            {/* Form Card */}
            <View style={styles.card}>
              <Text style={styles.cardSubtitle}>
                Add or update the phone number linked to your Responza account. This number is used by your trusted contacts to link you.
              </Text>
              
              <Input
                label="Phone Number"
                placeholder="e.g. +1234567890"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                editable={!saving}
              />
            </View>

            <View style={styles.buttonContainer}>
              <Button 
                title="Save Changes" 
                onPress={handleSave} 
                loading={saving}
                disabled={saving}
              />
            </View>
          </View>
        )}
      </ScrollView>
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
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 22,
    padding: 24,
    width: '100%',
    marginBottom: 24,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 'auto',
  },
});
