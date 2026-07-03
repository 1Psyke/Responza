import React, { useState, useEffect } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Alert, 
  ActivityIndicator, 
  TextInput,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../constants/theme';
import { getProfile, updateEmergencyNote } from '../src/services/profile';
import { Button } from '../components/Button';

const MAX_CHAR_LIMIT = 250;

export default function EmergencyNoteScreen() {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchNoteData = async () => {
      try {
        const profile = await getProfile();
        if (profile && isMounted) {
          if (profile.emergencyNote) {
            setNote(profile.emergencyNote);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load emergency note:', error);
        Alert.alert('Error', 'Failed to load emergency note.');
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchNoteData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEmergencyNote(note.trim());
      setSaving(false);
      Alert.alert(
        'Success',
        'Emergency note has been updated successfully!',
        [{ text: 'OK', onPress: () => router.replace('/profile' as any) }]
      );
    } catch (error: any) {
      console.error('Failed to update emergency note:', error);
      setSaving(false);
      const errorMessage = error?.message || 'Failed to update emergency note. Please try again.';
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
        <Text style={styles.headerTitle}>Emergency Note</Text>
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
                <Text style={styles.formTitle}>Emergency Note</Text>
                <Text style={styles.formSubtitle}>
                  {"Provide critical context (e.g. \"Penicillin allergy\", \"Diabetic\", \"Contact contact: Ray\") that first responders can access immediately."}
                </Text>

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Enter allergies, medical conditions, or extra emergency instructions..."
                    placeholderTextColor={Colors.light.placeholder}
                    value={note}
                    onChangeText={(text) => {
                      if (text.length <= MAX_CHAR_LIMIT) {
                        setNote(text);
                      }
                    }}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    editable={!saving}
                  />
                  <Text style={styles.charCount}>
                    {note.length} / {MAX_CHAR_LIMIT} characters
                  </Text>
                </View>
              </View>

              {/* Save Button */}
              <View style={styles.buttonContainer}>
                <Button 
                  title="Save Emergency Note" 
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
    marginBottom: 20,
    lineHeight: 20,
  },
  inputWrapper: {
    width: '100%',
  },
  textArea: {
    height: 150,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.cardBackground,
  },
  charCount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
});
