import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { resetPassword } from '../src/services/auth';

/**
 * Reset Password / Forgot Password Screen
 * Validates email address, sends a password reset link using Firebase Auth,
 * and handles loading and error states.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGetLink = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Validation Error', 'Please enter your email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(trimmedEmail);
      setLoading(false);
      Alert.alert(
        'Success',
        'Password reset email sent. Check your inbox.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          }
        ]
      );
    } catch (error: any) {
      setLoading(false);
      const errorMessage = error?.message || 'Failed to send password reset email. Please try again.';
      Alert.alert('Reset Error', errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              We&apos;ll send a reset link to your email
            </Text>
          </View>

          {/* Form Input */}
          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            
            <View style={styles.buttonContainer}>
              <Button 
                title="Get Link" 
                onPress={handleGetLink} 
                loading={loading} 
                disabled={loading}
              />
            </View>
          </View>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginTop: 60,
    marginBottom: 30,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  form: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  buttonContainer: {
    marginTop: 20,
  },
});
