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
import { getProfile, updateBloodType } from '../src/services/profile';
import { Button } from '../components/Button';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function MedicalInfoScreen() {
  const router = useRouter();
  const [selectedBloodType, setSelectedBloodType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchMedicalData = async () => {
      try {
        const profile = await getProfile();
        if (profile && isMounted) {
          if (profile.medicalInfo?.bloodType) {
            setSelectedBloodType(profile.medicalInfo.bloodType);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load medical info:', error);
        Alert.alert('Error', 'Failed to load medical information.');
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMedicalData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    if (!selectedBloodType) {
      Alert.alert('Validation Error', 'Please select a blood type.');
      return;
    }

    setSaving(true);
    try {
      await updateBloodType(selectedBloodType);
      setSaving(false);
      Alert.alert(
        'Success',
        'Your blood type has been updated successfully!',
        [{ text: 'OK', onPress: () => router.replace('/profile' as any) }]
      );
    } catch (error: any) {
      console.error('Failed to update blood type:', error);
      setSaving(false);
      const errorMessage = error?.message || 'Failed to update blood type. Please try again.';
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
        <Text style={styles.headerTitle}>Medical Info</Text>
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
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Select Blood Type</Text>
              <Text style={styles.formSubtitle}>
                In an emergency, emergency services or first responders will see this information on your lock screen.
              </Text>

              {/* Grid Selector */}
              <View style={styles.gridContainer}>
                {BLOOD_TYPES.map((type) => {
                  const isSelected = selectedBloodType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.gridItem,
                        isSelected && styles.gridItemActive
                      ]}
                      onPress={() => setSelectedBloodType(type)}
                      activeOpacity={0.7}
                      disabled={saving}
                    >
                      <Text style={[
                        styles.gridItemText,
                        isSelected && styles.gridItemTextActive
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Save Button */}
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '22%', // Roughly 4 items per row
    aspectRatio: 1,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  gridItemActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  gridItemText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  gridItemTextActive: {
    color: '#FFFFFF',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
});
