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
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../constants/theme';
import { getProfile, updatePins } from '../src/services/profile';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export default function CancelCodesScreen() {
  const router = useRouter();
  const [safePin, setSafePin] = useState('');
  const [distressPin, setDistressPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchPinsData = async () => {
      try {
        const profile = await getProfile();
        if (profile && isMounted) {
          if (profile.safePin) setSafePin(profile.safePin);
          if (profile.distressPin) setDistressPin(profile.distressPin);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load cancel codes:', error);
        Alert.alert('Error', 'Failed to load secret cancel codes.');
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPinsData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    // Basic formatting
    const cleanSafePin = safePin.trim();
    const cleanDistressPin = distressPin.trim();

    // Validations
    const pinRegex = /^\d{4}$/;

    if (!pinRegex.test(cleanSafePin)) {
      Alert.alert('Validation Error', 'Safe PIN must be exactly 4 numeric digits.');
      return;
    }

    if (!pinRegex.test(cleanDistressPin)) {
      Alert.alert('Validation Error', 'Distress PIN must be exactly 4 numeric digits.');
      return;
    }

    if (cleanSafePin === cleanDistressPin) {
      Alert.alert('Validation Error', 'Safe PIN and Distress PIN must be different.');
      return;
    }

    setSaving(true);
    try {
      await updatePins(cleanSafePin, cleanDistressPin);
      setSaving(false);
      Alert.alert(
        'Success',
        'Your cancel codes have been saved successfully!',
        [{ text: 'OK', onPress: () => router.replace('/profile' as any) }]
      );
    } catch (error: any) {
      console.error('Failed to update cancel codes:', error);
      setSaving(false);
      const errorMessage = error?.message || 'Failed to save cancel codes. Please try again.';
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
        <Text style={styles.headerTitle}>Secret PINs</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={Colors.light.accent} />
            </View>
          ) : (
            <View style={styles.contentContainer}>
              {/* Form Card */}
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Cancel Codes</Text>
                <Text style={styles.formSubtitle}>
                  Set up secret 4-digit codes to manage active alerts.
                </Text>

                {/* Safe PIN Input */}
                <View style={styles.pinSection}>
                  <Text style={styles.pinLabel}>Safe PIN</Text>
                  <Text style={styles.pinDesc}>
                    Enter this code to disarm an alarm when you are safe (deactivates the alarm).
                  </Text>
                  <Input
                    label="Safe PIN (4 Digits)"
                    placeholder="e.g. 1234"
                    value={safePin}
                    onChangeText={setSafePin}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    editable={!saving}
                  />
                </View>

                {/* Divider line */}
                <View style={styles.divider} />

                {/* Distress PIN Input */}
                <View style={styles.pinSection}>
                  <Text style={styles.pinLabel}>Distress PIN</Text>
                  <Text style={styles.pinDesc}>
                    Enter this code if forced by an attacker. It will visually close the alarm but secretly alert your contacts.
                  </Text>
                  <Input
                    label="Distress PIN (4 Digits)"
                    placeholder="e.g. 5678"
                    value={distressPin}
                    onChangeText={setDistressPin}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Save Button */}
              <View style={styles.buttonContainer}>
                <Button 
                  title="Save Cancel Codes" 
                  onPress={handleSave} 
                  loading={saving}
                  disabled={saving}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  loaderContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    width: '100%',
  },
  formCard: {
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 22,
    padding: 24,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  pinSection: {
    marginVertical: 10,
  },
  pinLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  pinDesc: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  divider: {
    height: 1.5,
    backgroundColor: '#F2F2F7',
    marginVertical: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
});
