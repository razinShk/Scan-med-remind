import { 
  getNurseConnectionMedications, 
  getActiveNurseConnections 
} from './SupabaseService';
import { scheduleMedicationReminder } from '../../utils/notifications';
import { addMedication, getMedications, updateMedication } from '../../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface for the shared medications that a nurse receives
interface SharedMedication {
  id: string;
  name: string;
  dosage: string;
  times: string[];
  startDate: string;
  duration: string;
  color: string;
  reminderEnabled: boolean;
  currentSupply: number;
  totalSupply: number;
  refillAt: number;
  refillReminder: boolean;
  sharedBy: string; // Original user's ID
  sharedByName: string; // Original user's name
  connectionId: string; // The nurse connection ID
  isShared: boolean; // Marker to identify this as a shared medication
}

// Load all medications shared with the user (when they're acting as a nurse)
export const loadSharedMedications = async (userId: string): Promise<SharedMedication[]> => {
  try {
    const sharedMedications: SharedMedication[] = [];
    
    // Get all active connections where the user is acting as a nurse
    const { data: nurseConnections } = await getActiveNurseConnections(userId, true);
    
    if (!nurseConnections || nurseConnections.length === 0) {
      return [];
    }
    
    // For each connection, get the shared medications
    for (const connection of nurseConnections) {
      const { data: medications } = await getNurseConnectionMedications(userId, connection.id);
      
      if (medications && medications.length > 0) {
        // Add each medication to the shared medications list with sender info
        medications.forEach(item => {
          if (item.medications) {
            sharedMedications.push({
              ...item.medications,
              sharedBy: connection.sender_id,
              sharedByName: connection.profiles.name || connection.profiles.username,
              connectionId: connection.id,
              isShared: true
            });
          }
        });
      }
    }
    
    return sharedMedications;
  } catch (error) {
    console.error('Error loading shared medications:', error);
    return [];
  }
};

// Schedule reminders for all shared medications
export const scheduleSharedMedicationReminders = async (userId: string): Promise<void> => {
  try {
    // Load all shared medications
    const sharedMedications = await loadSharedMedications(userId);
    
    // For each shared medication, schedule reminders
    for (const medication of sharedMedications) {
      // Create a modified notification title/body to indicate this is a shared medication
      const modifiedMedication = {
        ...medication,
        name: `${medication.name} (${medication.sharedByName})`, // Add sharer's name to medication name
      };
      
      // Schedule reminders for this medication
      await scheduleMedicationReminder(modifiedMedication);
    }
    
    console.log(`Scheduled reminders for ${sharedMedications.length} shared medications`);
  } catch (error) {
    console.error('Error scheduling shared medication reminders:', error);
  }
};

// Sync local and shared medications
export const syncSharedMedications = async (userId: string): Promise<void> => {
  try {
    // Load all shared medications from nurse connections
    const sharedMedications = await loadSharedMedications(userId);
    
    // Load all local medications
    const localMedications = await getMedications();
    
    // Filter out existing shared medications from local storage
    const nonSharedLocalMedications = localMedications.filter(
      med => !med.hasOwnProperty('isShared') || !med.isShared
    );
    
    // Check for any shared medications that need to be added/updated
    for (const sharedMed of sharedMedications) {
      const existingMedIndex = localMedications.findIndex(
        med => med.id === sharedMed.id && med.isShared
      );
      
      if (existingMedIndex === -1) {
        // This is a new shared medication, add it
        await addMedication(sharedMed);
        await scheduleMedicationReminder(sharedMed);
      } else {
        // This is an existing shared medication, update it if needed
        const existingMed = localMedications[existingMedIndex];
        
        // Check if any properties have changed
        if (JSON.stringify(existingMed) !== JSON.stringify(sharedMed)) {
          await updateMedication(sharedMed);
          await scheduleMedicationReminder(sharedMed);
        }
      }
    }
    
    // Remove any shared medications that are no longer shared
    const sharedMedIds = sharedMedications.map(med => med.id);
    const outdatedSharedMeds = localMedications.filter(
      med => med.isShared && !sharedMedIds.includes(med.id)
    );
    
    if (outdatedSharedMeds.length > 0) {
      // Create a new medications array without the outdated shared meds
      const updatedMedications = [...nonSharedLocalMedications, ...sharedMedications];
      
      // Save the updated medications array
      await AsyncStorage.setItem('@medications', JSON.stringify(updatedMedications));
    }
    
    console.log(`Synced shared medications: ${sharedMedications.length} active, ${outdatedSharedMeds.length} removed`);
  } catch (error) {
    console.error('Error syncing shared medications:', error);
  }
}; 