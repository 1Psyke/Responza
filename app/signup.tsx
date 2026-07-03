import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { signUp } from '../src/services/auth';

/**
 * Signup Screen
 * Collects name, email, phone, and password, and routes the user to the Home Dashboard on submission.
 */
export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter your name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, name, phone);
      
      setLoading(false);
      const completed = await AsyncStorage.getItem('responza_onboarding_completed');
      Alert.alert(
        'Success',
        'Your account has been created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              if (completed === 'true') {
                router.replace('/home' as any);
              } else {
                router.replace('/permissions' as any);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      setLoading(false);
      const errorMessage = error?.message || 'Failed to create account. Please try again.';
      Alert.alert('Registration Error', errorMessage);
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>log in to resume monitoring</Text>
          </View>

          {/* Form Inputs */}
          <View style={styles.form}>
            <Input
              label="Name"
              placeholder="name"
              value={name}
              onChangeText={setName}
            />

            <Input
              label="Email"
              placeholder="email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <Input
              label="Phone"
              placeholder="phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Input
              label="Password"
              placeholder="password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Terms text centered */}
          <Text style={styles.termsText}>I agree to Terms & Privacy</Text>

          {/* Create Account / Sign In Button */}
          <View style={styles.footer}>
            <Button title="Create Account" onPress={handleSignup} loading={loading} />

            {/* Navigation back helper */}
            <TouchableOpacity 
              onPress={() => router.push('/login' as any)} 
              style={styles.loginLink}
            >
              <Text style={styles.loginLinkText}>Already have an account? Log in</Text>
            </TouchableOpacity>
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
    marginTop: 50,
    marginBottom: 20,
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
    marginBottom: 20,
  },
  termsText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    marginVertical: 15,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  loginLink: {
    marginTop: 15,
  },
  loginLinkText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
