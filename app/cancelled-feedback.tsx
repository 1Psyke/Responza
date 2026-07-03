import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Alert, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
// @ts-ignore
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../constants/theme';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../src/services/firebase';
import { Button } from '../components/Button';

const FEEDBACK_OPTIONS = [
  'Phone dropped',
  'I was exercising',
  'Misdetection',
  'Other'
];

export default function CancelledFeedbackScreen() {
  const router = useRouter();
  const { alertId, disarmType } = useLocalSearchParams<{ alertId: string; disarmType: string }>();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedOption) {
      Alert.alert('Selection Required', 'Please select an option to submit feedback.');
      return;
    }

    if (!alertId) {
      router.replace('/home' as any);
      return;
    }

    setSubmitting(true);
    try {
      // If disarmed safely, save specific reason
      if (disarmType === 'safe') {
        const docRef = doc(db, 'alerts', alertId);
        await updateDoc(docRef, {
          cancelReason: selectedOption
        });
      }
      
      setSubmitting(false);
      router.replace('/cancelled-success' as any);
    } catch (err: any) {
      console.error('Failed to submit feedback:', err);
      setSubmitting(false);
      // Fallback redirect
      router.replace('/cancelled-success' as any);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Block */}
        <View style={styles.alertHeader}>
          <Text style={styles.alertHeaderText}>Alert cancelled</Text>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Tell us what happened so we can reduce false alerts.
        </Text>

        {/* Radio options container */}
        <View style={styles.optionsList}>
          {FEEDBACK_OPTIONS.map((option) => {
            const isSelected = selectedOption === option;
            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardActive
                ]}
                onPress={() => setSelectedOption(option)}
                activeOpacity={0.7}
                disabled={submitting}
              >
                <Text style={styles.optionText}>{option}</Text>
                <View style={[
                  styles.radioButton,
                  isSelected && styles.radioButtonActive
                ]}>
                  {isSelected && <View style={styles.radioButtonDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <Button 
            title="Submit feedback" 
            onPress={handleSubmit} 
            loading={submitting}
            disabled={submitting || !selectedOption}
          />
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
  alertHeader: {
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
  alertHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  optionsList: {
    width: '100%',
    gap: 12,
    marginBottom: 30,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionCardActive: {
    borderColor: Colors.light.primary,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioButtonActive: {
    borderColor: Colors.light.primary,
  },
  radioButtonDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.light.primary,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
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
