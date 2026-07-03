import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../components/Button';
import { Colors } from '../constants/theme';

/**
 * Splash Screen (Entry point)
 * Features the RESPONZA brand logo, tagline, and navigation to Sign Up and Login flows.
 */
export default function SplashScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkCarouselOnboarding = async () => {
      try {
        const carouselCompleted = await AsyncStorage.getItem('responza_carousel_onboarding_completed');
        if (carouselCompleted !== 'true') {
          router.replace('/onboarding' as any);
          return;
        }

        const permissionsCompleted = await AsyncStorage.getItem('responza_onboarding_completed');
        if (permissionsCompleted !== 'true') {
          router.replace('/permissions' as any);
          return;
        }

        setChecking(false);
      } catch (err) {
        console.error('[SPLASH] Failed to check onboarding status:', err);
        setChecking(false);
      }
    };
    checkCarouselOnboarding();
  }, [router]);

  if (checking) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.brandTitle}>RESPONZA</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Vector Shield Logo Container */}
        <View style={styles.logoContainer}>
          <View style={styles.shieldFrame}>
            {/* Arrow Tip and Shaft */}
            <View style={styles.arrowContainer}>
              <View style={styles.arrowTip} />
              <View style={styles.arrowShaft} />
            </View>

            {/* Soundwave Bars - Left Side */}
            <View style={[styles.waveContainer, styles.wavesLeft]}>
              <View style={[styles.waveBar, { height: 25 }]} />
              <View style={[styles.waveBar, { height: 45 }]} />
              <View style={[styles.waveBar, { height: 60 }]} />
            </View>

            {/* Soundwave Bars - Right Side */}
            <View style={[styles.waveContainer, styles.wavesRight]}>
              <View style={[styles.waveBar, { height: 60 }]} />
              <View style={[styles.waveBar, { height: 45 }]} />
              <View style={[styles.waveBar, { height: 25 }]} />
            </View>
          </View>
        </View>

        {/* Brand Typography */}
        <Text style={styles.brandTitle}>RESPONZA</Text>
        <Text style={styles.tagline}>silent emergency alert network</Text>
      </View>

      {/* Navigation Actions */}
      <View style={styles.actionsContainer}>
        <Button
          title="Sign up"
          onPress={() => router.push('/signup' as any)}
        />

        <Text style={styles.helperText}>Already have an account?</Text>

        <Button
          title="Log in"
          onPress={() => router.push('/login' as any)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  logoContainer: {
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldFrame: {
    width: 150,
    height: 170,
    borderWidth: 6,
    borderColor: Colors.light.accent,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderBottomLeftRadius: 75,
    borderBottomRightRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  arrowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    height: '100%',
    zIndex: 2,
  },
  arrowTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.light.accent,
    marginBottom: -1,
  },
  arrowShaft: {
    width: 6,
    height: 90,
    backgroundColor: Colors.light.accent,
  },
  waveContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    zIndex: 1,
  },
  wavesLeft: {
    left: 18,
    gap: 6,
  },
  wavesRight: {
    right: 18,
    gap: 6,
  },
  waveBar: {
    width: 5,
    backgroundColor: Colors.light.accent,
    borderRadius: 3,
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: Colors.light.text,
    letterSpacing: 2,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  actionsContainer: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  helperText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginVertical: 10,
    fontWeight: '500',
  },
});
