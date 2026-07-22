import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

export interface AlertDocument {
  id: string;
  uid: string;
  type: string; // 'manual_sos' | 'fall_detection' | etc.
  status: 'pending' | 'active' | 'cancelled' | 'resolved';
  createdAt: any; // Firestore Timestamp
  resolvedAt: any | null;
  cancelReason: string | null;
  contacts: any[]; // trusted contacts active at alert generation
  location: {
    latitude: number;
    longitude: number;
    mapLink?: string;
    timestamp?: number;
  } | null;
  senderName?: string;
  senderPhone?: string;
  senderMedicalInfo?: any;
  senderEmergencyNote?: string;
  recipientUids?: string[];
}

/**
 * Creates a new alert document inside alerts/{alertId}
 * 
 * @param uid - The user's UID.
 * @param type - The alert trigger type (e.g. 'manual_sos').
 * @param contacts - Array of trusted contacts at the time of the alert.
 * @param location - The user's coordinates payload.
 * @returns A promise resolving to the created AlertDocument.
 */
export async function createAlert(
  uid: string, 
  type: string, 
  contacts: any[], 
  location: any
): Promise<AlertDocument> {
  try {
    const alertsCollectionRef = collection(db, 'alerts');
    const newDocRef = doc(alertsCollectionRef); // Generates a unique alert ID
    
    // Fetch sender profile details to embed in the alert document
    let senderName = 'A User';
    let senderPhone = '';
    let senderMedicalInfo = null;
    let senderEmergencyNote = '';
    
    try {
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        senderName = userData.name || 'A User';
        senderPhone = userData.phone || '';
        senderMedicalInfo = userData.medicalInfo || null;
        senderEmergencyNote = userData.emergencyNote || '';
      }
    } catch (profileErr) {
      console.warn('[ALERTS] Failed to load sender profile for embedding:', profileErr);
    }

    // Extract any pre-existing recipient UIDs from the contacts array
    const recipientUids: string[] = contacts
      .map((c) => c.uid || c.contactUid)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
    
    const alertData: AlertDocument = {
      id: newDocRef.id,
      uid,
      type,
      status: 'pending',
      createdAt: serverTimestamp(),
      resolvedAt: null,
      cancelReason: null,
      contacts,
      location: location || null,
      senderName,
      senderPhone,
      senderMedicalInfo,
      senderEmergencyNote,
      recipientUids
    };

    await setDoc(newDocRef, alertData);
    return alertData;
  } catch (error) {
    console.error('Error in createAlert:', error);
    throw error;
  }
}

/**
 * Cancels an active/pending alert in Firestore.
 * 
 * @param alertId - The target alert document ID.
 * @param reason - The reason description.
 */
export async function cancelAlert(alertId: string, reason: string): Promise<void> {
  try {
    const docRef = doc(db, 'alerts', alertId);
    await updateDoc(docRef, {
      status: 'cancelled',
      cancelReason: reason
    });
  } catch (error) {
    console.error('Error in cancelAlert:', error);
    throw error;
  }
}

/**
 * Resolves an active alert in Firestore.
 * 
 * @param alertId - The target alert document ID.
 */
export async function resolveAlert(alertId: string): Promise<void> {
  try {
    const docRef = doc(db, 'alerts', alertId);
    await updateDoc(docRef, {
      status: 'resolved',
      resolvedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error in resolveAlert:', error);
    throw error;
  }
}

/**
 * Retrieves all alerts for a specific user from Firestore.
 * 
 * @param uid - The user's UID.
 * @returns A promise resolving to an array of AlertDocuments sorted by creation time descending.
 */
export async function getUserAlerts(uid: string): Promise<AlertDocument[]> {
  try {
    const alertsCollectionRef = collection(db, 'alerts');
    const q = query(
      alertsCollectionRef, 
      where('uid', '==', uid)
    );
    const querySnapshot = await getDocs(q);
    
    const alerts: AlertDocument[] = [];
    querySnapshot.forEach((docSnap) => {
      alerts.push(docSnap.data() as AlertDocument);
    });
    
    // Sort locally by createdAt descending (newest first)
    alerts.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

    return alerts;
  } catch (error) {
    console.error('Error in getUserAlerts:', error);
    throw error;
  }
}

/**
 * Retrieves details for a specific alert document.
 * 
 * @param alertId - The target alert document ID.
 * @returns A promise resolving to the AlertDocument or null if not found.
 */
export async function getAlertById(alertId: string): Promise<AlertDocument | null> {
  try {
    const docRef = doc(db, 'alerts', alertId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as AlertDocument;
    }
    return null;
  } catch (error) {
    console.error('Error in getAlertById:', error);
    throw error;
  }
}
