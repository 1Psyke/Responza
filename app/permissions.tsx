import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Switch, 
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { DeviceMotion } from 'expo-sensors';
import { requestUserPermission } from '../src/services/fcm';
import { Colors } from '../constants/theme';

export default function PermissionsScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(0);
  
  // Permission statuses
  const [locationDenied, setLocationDenied] = useState<boolean>(false);
  const [motionDenied, setMotionDenied] = useState<boolean>(false);
  const [notificationDenied, setNotificationDenied] = useState<boolean>(false);
  
  // Location mode selection ('always' vs 'while_using')
  const [locationOption, setLocationOption] = useState<'always' | 'while_using'>('always');
  
  // Toggles for step 3
  const [smsEnabled, setSmsEnabled] = useState<boolean>(true);
  const [contactsEnabled, setContactsEnabled] = useState<boolean>(true);
  const [backgroundEnabled, setBackgroundEnabled] = useState<boolean>(true);
  const [batteryEnabled, setBatteryEnabled] = useState<boolean>(true);

  // Logo mark matching Figma: red up arrow with dashes on the left
  const ResponzaMiniLogo = () => (
    <View style={styles.miniLogoContainer}>
      <View style={styles.logoDashes}>
        <View style={[styles.logoDash, { width: 5 }]} />
        <View style={[styles.logoDash, { width: 8 }]} />
        <View style={[styles.logoDash, { width: 5 }]} />
      </View>
      <View style={styles.logoArrow}>
        <View style={styles.logoArrowTip} />
        <View style={styles.logoArrowShaft} />
      </View>
    </View>
  );

  // STEP 0: Location Permission request
  const requestLocationPermission = async () => {
    try {
      const { status: foreStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foreStatus !== 'granted') {
        setLocationDenied(true);
        return;
      }

      if (locationOption === 'always') {
        const { status: backStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backStatus !== 'granted') {
          console.warn('[Permissions] Background location permission denied.');
        }
      }

      setLocationDenied(false);
      goToNextStep();
    } catch (err) {
      console.error('[Permissions] Location request error:', err);
      setLocationDenied(true);
    }
  };

  // STEP 1: Motion / Activity request
  const requestMotionPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        const { status } = await DeviceMotion.requestPermissionsAsync();
        if (status !== 'granted') {
          setMotionDenied(true);
          return;
        }
      }
      setMotionDenied(false);
      goToNextStep();
    } catch (err) {
      console.error('[Permissions] Motion request error:', err);
      // Motion sensors don't require runtime permission on standard Android SDKs
      goToNextStep();
    }
  };

  // STEP 2: Notifications request
  const requestNotificationPermission = async () => {
    try {
      const granted = await requestUserPermission();
      if (!granted) {
        setNotificationDenied(true);
        return;
      }
      setNotificationDenied(false);
      goToNextStep();
    } catch (err) {
      console.error('[Permissions] Notifications request error:', err);
      setNotificationDenied(true);
    }
  };

  const goToNextStep = () => {
    setCurrentStep((prev) => prev + 1);
  };

  const goToPrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('responza_onboarding_completed', 'true');
      
      // Save specific feature toggles to local preferences for later retrieval
      await AsyncStorage.setItem('pref_sms_fallback', smsEnabled.toString());
      await AsyncStorage.setItem('pref_contacts_pick', contactsEnabled.toString());
      await AsyncStorage.setItem('pref_background_run', backgroundEnabled.toString());
      await AsyncStorage.setItem('pref_battery_expert', batteryEnabled.toString());

      router.replace('/' as any);
    } catch (err) {
      console.error('[Permissions] Failed to save onboarding completion:', err);
      router.replace('/' as any);
    }
  };

  // Renders the Location screen (Step 0)
  const renderLocationStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepBody}>
        <View style={styles.illustrationContainer}>
          <Ionicons name="location-sharp" size={54} color="#000000" />
        </View>

        <Text style={styles.title}>Always-on Location</Text>
        <Text style={styles.subtitle}>Shared only when an alert triggers.</Text>

        {locationDenied ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={24} color="#E22D2D" style={styles.errorIcon} />
            <Text style={styles.errorTitle}>Location Sharing Limited</Text>
            <Text style={styles.errorText}>
              Emergency contacts won&apos;t be able to see your coordinates. Maps link integration will be disabled.
            </Text>
          </View>
        ) : (
          <View style={styles.locationSelectionContainer}>
            <TouchableOpacity 
              style={[styles.locationOptionCard, locationOption === 'while_using' && styles.locationOptionCardSelected]}
              onPress={() => setLocationOption('while_using')}
              activeOpacity={0.7}
            >
              <View style={[styles.customRadio, locationOption === 'while_using' && styles.customRadioSelected]} />
              <Text style={styles.locationOptionText}>While using app</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.locationOptionCard, locationOption === 'always' && styles.locationOptionCardSelected]}
              onPress={() => setLocationOption('always')}
              activeOpacity={0.7}
            >
              <View style={[styles.customRadio, locationOption === 'always' && styles.customRadioAlways]} />
              <Text style={styles.locationOptionText}>Always (recommended)</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.actionContainer}>
        {locationDenied ? (
          <>
            <TouchableOpacity style={styles.primaryButton} onPress={requestLocationPermission} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>Retry Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipButton} onPress={goToNextStep} activeOpacity={0.8}>
              <Text style={styles.skipButtonText}>Continue anyway</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={requestLocationPermission} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Renders the Motion screen (Step 1)
  const renderMotionStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepBody}>
        <View style={styles.illustrationContainer}>
          <Ionicons name="walk-outline" size={54} color="#000000" />
        </View>

        <Text style={styles.title}>Motion & Fitness</Text>
        <Text style={styles.subtitle}>Required to detect falls, impacts, and inactivity.</Text>

        {motionDenied ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={24} color="#E22D2D" style={styles.errorIcon} />
            <Text style={styles.errorTitle}>Detection Service Limited</Text>
            <Text style={styles.errorText}>
              Responza won&apos;t be able to monitor physical activity. Crash/impact and fall detection will be disabled.
            </Text>
          </View>
        ) : (
          <View style={styles.whyCard}>
            <View style={styles.whyHeader}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#E22D2D" style={{ marginRight: 8 }} />
              <Text style={styles.whyTitle}>Why ?</Text>
            </View>
            <Text style={styles.whyBody}>
              Accelerometer + gyroscope data is processed locally on-device. Your movement data is never uploaded or shared.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actionContainer}>
        {motionDenied ? (
          <>
            <TouchableOpacity style={styles.primaryButton} onPress={requestMotionPermission} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>Retry Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipButton} onPress={goToNextStep} activeOpacity={0.8}>
              <Text style={styles.skipButtonText}>Continue anyway</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.primaryButton} onPress={requestMotionPermission} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>Allow</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.notNowButton} onPress={goToNextStep} activeOpacity={0.7}>
              <Text style={styles.notNowText}>Not now</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  // Renders the Notifications screen (Step 2)
  const renderNotificationsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepBody}>
        <View style={styles.illustrationContainer}>
          <Ionicons name="notifications-outline" size={54} color="#000000" />
        </View>

        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>Required to send you safety checks and disarm updates.</Text>

        {notificationDenied ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={24} color="#E22D2D" style={styles.errorIcon} />
            <Text style={styles.errorTitle}>Alerts Blocked</Text>
            <Text style={styles.errorText}>
              You will miss critical check-in notifications, verification timers, and safety responses from your contacts.
            </Text>
          </View>
        ) : (
          <View style={styles.whyCard}>
            <View style={styles.whyHeader}>
              <Ionicons name="notifications-circle-outline" size={20} color="#E22D2D" style={{ marginRight: 8 }} />
              <Text style={styles.whyTitle}>Why ?</Text>
            </View>
            <Text style={styles.whyBody}>
              To ensure you receive urgent safety checks and critical emergency disarm updates immediately.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actionContainer}>
        {notificationDenied ? (
          <>
            <TouchableOpacity style={styles.primaryButton} onPress={requestNotificationPermission} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>Retry Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipButton} onPress={goToNextStep} activeOpacity={0.8}>
              <Text style={styles.skipButtonText}>Continue anyway</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.primaryButton} onPress={requestNotificationPermission} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>Allow</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.notNowButton} onPress={goToNextStep} activeOpacity={0.7}>
              <Text style={styles.notNowText}>Not now</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  // Renders Toggle Preferences screen (Step 3)
  const renderTogglesStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepBody}>
        <View style={styles.togglesList}>
          
          {/* SMS Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabels}>
              <Text style={styles.toggleTitle}>SMS</Text>
              <Text style={styles.toggleSubtitle}>Fallback when offline</Text>
            </View>
            <Switch 
              value={smsEnabled} 
              onValueChange={setSmsEnabled}
              trackColor={{ false: '#E5E5EA', true: '#000000' }}
              thumbColor={smsEnabled ? '#ffffff' : '#f4f3f4'}
              ios_backgroundColor="#E5E5EA"
            />
          </View>

          {/* Contacts Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabels}>
              <Text style={styles.toggleTitle}>CONTACTS</Text>
              <Text style={styles.toggleSubtitle}>Pick trusted people</Text>
            </View>
            <Switch 
              value={contactsEnabled} 
              onValueChange={setContactsEnabled}
              trackColor={{ false: '#E5E5EA', true: '#000000' }}
              thumbColor={contactsEnabled ? '#ffffff' : '#f4f3f4'}
              ios_backgroundColor="#E5E5EA"
            />
          </View>

          {/* Background Run Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabels}>
              <Text style={styles.toggleTitle}>BACKGROUND RUN</Text>
              <Text style={styles.toggleSubtitle}>Keeps monitoring 24/7</Text>
            </View>
            <Switch 
              value={backgroundEnabled} 
              onValueChange={setBackgroundEnabled}
              trackColor={{ false: '#E5E5EA', true: '#000000' }}
              thumbColor={backgroundEnabled ? '#ffffff' : '#f4f3f4'}
              ios_backgroundColor="#E5E5EA"
            />
          </View>

          {/* Battery Expert Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabels}>
              <Text style={styles.toggleTitle}>BATTERY EXPERT</Text>
              <Text style={styles.toggleSubtitle}>Prevents OS from killing app</Text>
            </View>
            <Switch 
              value={batteryEnabled} 
              onValueChange={setBatteryEnabled}
              trackColor={{ false: '#E5E5EA', true: '#000000' }}
              thumbColor={batteryEnabled ? '#ffffff' : '#f4f3f4'}
              ios_backgroundColor="#E5E5EA"
            />
          </View>

        </View>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={completeOnboarding} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Block */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {currentStep > 0 ? (
            <TouchableOpacity onPress={goToPrevStep} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color="#000000" />
            </TouchableOpacity>
          ) : (
            <ResponzaMiniLogo />
          )}
        </View>
        <Text style={styles.headerTitle}>Permissions</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tagline */}
      <Text style={styles.tagline}>Enable these permissions to help us keep you safe</Text>

      {/* Onboarding Wizard Steps */}
      <View style={styles.content}>
        {currentStep === 0 && renderLocationStep()}
        {currentStep === 1 && renderMotionStep()}
        {currentStep === 2 && renderNotificationsStep()}
        {currentStep === 3 && renderTogglesStep()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  headerLeft: {
    width: 48,
    alignItems: 'flex-start',
  },
  headerRight: {
    width: 48,
  },
  backButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.light.background, // Responza theme pink background
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 32,
    shadowColor: '#E22D2D',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  stepContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
  },
  stepBody: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  illustrationContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 12,
    lineHeight: 22,
  },
  whyCard: {
    width: '100%',
    backgroundColor: '#FFF5F5', // Premium solid light red/pink color
    borderWidth: 1.5,
    borderColor: '#FADCDD',     // Premium solid soft red border color
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 22,
    marginBottom: 24,
    overflow: 'hidden',         // Prevents Android inner rectangular rendering bug
    shadowColor: '#E22D2D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  whyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  whyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E22D2D',
  },
  whyBody: {
    fontSize: 13,
    color: '#444444',
    fontWeight: '500',
    lineHeight: 19,
  },
  locationSelectionContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  locationOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  locationOptionCardSelected: {
    borderColor: '#000000',
  },
  customRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  customRadioSelected: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  customRadioAlways: {
    borderColor: '#34C759',
    backgroundColor: '#34C759',
  },
  locationOptionText: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '700',
  },
  actionContainer: {
    width: '100%',
    gap: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  primaryButton: {
    backgroundColor: '#000000',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  notNowButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notNowText: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  errorContainer: {
    width: '100%',
    backgroundColor: '#FFF2F2',
    borderWidth: 1.5,
    borderColor: 'rgba(226, 45, 45, 0.25)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 22,
    alignItems: 'center',
    marginBottom: 24,
  },
  errorIcon: {
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.accent,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 19,
    fontWeight: '500',
  },
  skipButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  skipButtonText: {
    color: Colors.light.text,
    fontSize: 15,
    fontWeight: '700',
  },
  togglesList: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  toggleLabels: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  miniLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoDashes: {
    marginRight: 4,
    gap: 3,
    alignItems: 'flex-end',
  },
  logoDash: {
    height: 2,
    backgroundColor: '#E22D2D',
    borderRadius: 1,
  },
  logoArrow: {
    alignItems: 'center',
  },
  logoArrowTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#E22D2D',
  },
  logoArrowShaft: {
    width: 2,
    height: 12,
    backgroundColor: '#E22D2D',
    marginTop: -1,
  },
});
