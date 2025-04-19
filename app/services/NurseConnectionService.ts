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
    
    console.log('Nurse connections for shared medications:', nurseConnections);
    
    if (!nurseConnections || nurseConnections.length === 0) {
      console.log('No nurse connections found for shared medications');
      return [];
    }
    
    // For each connection, get the shared medications
    for (const connection of nurseConnections) {
      console.log('Processing connection for medications:', connection.id);
      const { data: medications } = await getNurseConnectionMedications(userId, connection.id);
      
      console.log('Raw medication data for connection:', medications);
      
      if (medications && medications.length > 0) {
        // Add each medication to the shared medications list with sender info
        medications.forEach(item => {
          console.log('Processing medication item:', item);
          
          // Handle different possible data structures
          if (item.medications) {
            // Standard structure where medications is an object
            sharedMedications.push({
              ...item.medications,
              sharedBy: connection.sender_id,
              sharedByName: connection.profiles.name || connection.profiles.username,
              connectionId: connection.id,
              isShared: true
            });
          } else if (item.medication_id) {
            // Alternative structure where we just have the medication ID
            // Try to fetch the medication from AsyncStorage
            // This is a fallback approach
            AsyncStorage.getItem('@medications').then(medicationsData => {
              if (medicationsData) {
                const allMeds = JSON.parse(medicationsData);
                const foundMed = allMeds.find((m: any) => m.id === item.medication_id);
                
                if (foundMed) {
                  sharedMedications.push({
                    ...foundMed,
                    sharedBy: connection.sender_id,
                    sharedByName: connection.profiles.name || connection.profiles.username,
                    connectionId: connection.id,
                    isShared: true
                  });
                }
              }
            }).catch(err => console.error('Error fetching local medications:', err));
          }
        });
      } else {
        console.log('No medications found for connection:', connection.id);
      }
    }
    
    console.log('Final shared medications:', sharedMedications);
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
    console.log('Starting medication sync for user:', userId);
    
    // Get active connections where user is a nurse
    const { data: nurseConnections } = await getActiveNurseConnections(userId, true);
    console.log('Active nurse connections for sync:', nurseConnections);
    
    if (!nurseConnections || nurseConnections.length === 0) {
      console.log('No active nurse connections found for sync');
      return;
    }
    
    // Load all local medications
    const localMedications = await getMedications();
    console.log('Local medications count:', localMedications.length);
    
    // Filter out existing shared medications from local storage
    const nonSharedLocalMedications = localMedications.filter(
      med => !med.hasOwnProperty('isShared') || !med.isShared
    );
    
    // Track medications that should be shared
    const sharedMedicationIds: string[] = [];
    const sharedMedications: SharedMedication[] = [];
    
    // For each connection, get and process the shared medications
    for (const connection of nurseConnections) {
      console.log('Processing connection for sync:', connection.id);
      const { data: medications } = await getNurseConnectionMedications(userId, connection.id);
      
      if (medications && medications.length > 0) {
        console.log(`Found ${medications.length} medications to sync for connection ${connection.id}`);
        
        // Process each medication ID
        for (const item of medications) {
          if (!item.medication_id) continue;
          
          sharedMedicationIds.push(item.medication_id);
          
          // Try to find this medication in the user's own medications
          const existingMed = localMedications.find(m => m.id === item.medication_id);
          
          if (existingMed) {
            // Use the user's own medication data but mark it as shared
            const sharedMed: SharedMedication = {
              ...existingMed,
              sharedBy: connection.sender_id,
              sharedByName: connection.profiles.name || connection.profiles.username,
              connectionId: connection.id,
              isShared: true
            };
            
            sharedMedications.push(sharedMed);
            
            // Also update medication reminders
            await scheduleMedicationReminder({
              ...sharedMed,
              name: `${sharedMed.name} (${sharedMed.sharedByName})` // Add sharer's name
            });
          } else {
            // This is a medication we don't have local data for
            console.log(`Missing local data for medication ${item.medication_id}`);
            // You could implement a network request to fetch medication details here
            // if you have an endpoint that can provide medication details by ID
          }
        }
      }
    }
    
    console.log(`Found ${sharedMedications.length} shared medications to save locally`);
    
    // If we have any shared medications, add them to local storage
    if (sharedMedications.length > 0) {
      // Combine non-shared medications with shared ones
      const updatedMedications = [...nonSharedLocalMedications, ...sharedMedications];
      
      // Save the updated array
      await AsyncStorage.setItem('@medications', JSON.stringify(updatedMedications));
      console.log('Saved updated medications to local storage');
    }
    
    // Remove shared medications that are no longer shared
    const outdatedSharedMeds = localMedications.filter(
      med => med.isShared && !sharedMedicationIds.includes(med.id)
    );
    
    if (outdatedSharedMeds.length > 0) {
      console.log(`Removing ${outdatedSharedMeds.length} outdated shared medications`);
      // This is handled by the code above that only keeps current shared medications
    }
    
    console.log(`Completed medication sync: ${sharedMedications.length} active, ${outdatedSharedMeds.length} removed`);
  } catch (error) {
    console.error('Error syncing shared medications:', error);
  }
}; 