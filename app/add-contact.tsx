import React, { useState } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Alert, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../constants/theme';
import { getCurrentUser } from '../src/services/auth';
import { addContact, getContacts } from '../src/services/contacts';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

const RELATIONSHIP_SUGGESTIONS = ['Mom', 'Dad', 'Sibling', 'Spouse', 'Friend', 'Doctor'];

export default function AddContactScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    // Basic Input Validations
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Validation Error', 'Please enter a phone number.');
      return;
    }
    if (!relationship.trim()) {
      Alert.alert('Validation Error', 'Please specify your relationship (e.g. Mom).');
      return;
    }

    setLoading(true);
    try {
      const user = getCurrentUser();
      if (!user) {
        Alert.alert('Session Expired', 'Please log in to add contacts.');
        router.replace('/login' as any);
        return;
      }

      // Enforce maximum 5 trusted contacts
      const existingContacts = await getContacts(user.uid);
      if (existingContacts.length >= 5) {
        Alert.alert(
          'Limit Reached',
          'You can only have up to 5 trusted contacts. Please delete an existing contact before adding a new one.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        setLoading(false);
        return;
      }

      // Save to Firestore
      await addContact(user.uid, {
        name: name.trim(),
        phone: phone.trim(),
        relationship: relationship.trim(),
        enabled: true
      });

      setLoading(false);
      Alert.alert(
        'Success',
        'Trusted contact added successfully!',
        [{ text: 'OK', onPress: () => router.replace('/contacts' as any) }]
      );
    } catch (error: any) {
      console.error('Failed to save contact:', error);
      setLoading(false);
      const errorMessage = error?.message || 'Failed to save contact. Please try again.';
      Alert.alert('Save Error', errorMessage);
    }
  };

  const handleSuggestionPress = (value: string) => {
    setRelationship(value);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Contact</Text>
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
          {/* Main Card Container */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Contact Details</Text>
            <Text style={styles.formSubtitle}>
              These details will be used to send alerts during emergencies.
            </Text>

            <Input
              label="Name"
              placeholder="Name"
              value={name}
              onChangeText={setName}
              editable={!loading}
            />

            <Input
              label="Phone Number"
              placeholder="Phone Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!loading}
            />

            <Input
              label="Relationship"
              placeholder="Relationship (e.g. Mom, Spouse)"
              value={relationship}
              onChangeText={setRelationship}
              editable={!loading}
            />

            {/* Suggestions list */}
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Suggestions:</Text>
              <View style={styles.suggestionsRow}>
                {RELATIONSHIP_SUGGESTIONS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.suggestionPill,
                      relationship.toLowerCase() === item.toLowerCase() && styles.activePill
                    ]}
                    onPress={() => handleSuggestionPress(item)}
                    disabled={loading}
                  >
                    <Text 
                      style={[
                        styles.suggestionText,
                        relationship.toLowerCase() === item.toLowerCase() && styles.activePillText
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Action Button */}
          <View style={styles.buttonContainer}>
            <Button 
              title="Save Contact" 
              onPress={handleSave} 
              loading={loading}
              disabled={loading}
            />
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
  suggestionsContainer: {
    marginTop: 15,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionPill: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  activePill: {
    borderColor: Colors.light.text,
    backgroundColor: Colors.light.text,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  activePillText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
});
