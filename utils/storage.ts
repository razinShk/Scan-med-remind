import AsyncStorage from "@react-native-async-storage/async-storage";

const MEDICATIONS_KEY = "@medications";
const DOSE_HISTORY_KEY = "@dose_history";
const USER_CREDITS_KEY = "@user_credits";

export interface Medication {
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
  lastRefillDate?: string;
  notes?: string;
}

export interface DoseHistory {
  id: string;
  medicationId: string;
  timestamp: string;
  taken: boolean;
}

// User credits interface for storing scan prescription credits
export interface UserCredits {
  availableCredits: number;
  lastResetDate: string; // ISO date string
}

export async function getMedications(): Promise<Medication[]> {
  try {
    const data = await AsyncStorage.getItem(MEDICATIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting medications:", error);
    return [];
  }
}

export async function addMedication(medication: Medication): Promise<void> {
  try {
    const medications = await getMedications();
    medications.push(medication);
    await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(medications));
  } catch (error) {
    console.error("Error adding medication:", error);
    throw error;
  }
}

export async function updateMedication(
  updatedMedication: Medication
): Promise<void> {
  try {
    const medications = await getMedications();
    const index = medications.findIndex(
      (med) => med.id === updatedMedication.id
    );
    if (index !== -1) {
      medications[index] = updatedMedication;
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(medications));
    }
  } catch (error) {
    console.error("Error updating medication:", error);
    throw error;
  }
}

export async function deleteMedication(id: string): Promise<void> {
  try {
    const medications = await getMedications();
    const updatedMedications = medications.filter((med) => med.id !== id);
    await AsyncStorage.setItem(
      MEDICATIONS_KEY,
      JSON.stringify(updatedMedications)
    );
  } catch (error) {
    console.error("Error deleting medication:", error);
    throw error;
  }
}

export async function getDoseHistory(): Promise<DoseHistory[]> {
  try {
    const data = await AsyncStorage.getItem(DOSE_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting dose history:", error);
    return [];
  }
}

export async function getTodaysDoses(): Promise<DoseHistory[]> {
  try {
    const history = await getDoseHistory();
    const today = new Date().toDateString();
    return history.filter(
      (dose) => new Date(dose.timestamp).toDateString() === today
    );
  } catch (error) {
    console.error("Error getting today's doses:", error);
    return [];
  }
}

export async function recordDose(
  medicationId: string,
  taken: boolean,
  timestamp: string
): Promise<void> {
  try {
    const history = await getDoseHistory();
    const newDose: DoseHistory = {
      id: Math.random().toString(36).substr(2, 9),
      medicationId,
      timestamp,
      taken,
    };

    history.push(newDose);
    await AsyncStorage.setItem(DOSE_HISTORY_KEY, JSON.stringify(history));

    // Update medication supply if taken
    if (taken) {
      const medications = await getMedications();
      const medication = medications.find((med) => med.id === medicationId);
      if (medication && medication.currentSupply > 0) {
        medication.currentSupply -= 1;
        await updateMedication(medication);
      }
    }
  } catch (error) {
    console.error("Error recording dose:", error);
    throw error;
  }
}

export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([MEDICATIONS_KEY, DOSE_HISTORY_KEY]);
  } catch (error) {
    console.error("Error clearing data:", error);
    throw error;
  }
}

// Get the user's available scan prescription credits
export async function getUserCredits(): Promise<UserCredits> {
  try {
    const today = new Date().toDateString();
    const data = await AsyncStorage.getItem(USER_CREDITS_KEY);
    const userCredits = data ? JSON.parse(data) : null;

    // If no credits data or last reset date is not today, reset credits
    if (!userCredits || new Date(userCredits.lastResetDate).toDateString() !== today) {
      // Create new credits for today
      const newCredits: UserCredits = {
        availableCredits: 5, // Default 5 credits per day
        lastResetDate: new Date().toISOString()
      };
      
      // Save to storage
      await AsyncStorage.setItem(USER_CREDITS_KEY, JSON.stringify(newCredits));
      return newCredits;
    }

    return userCredits;
  } catch (error) {
    console.error("Error getting user credits:", error);
    // Return default credits if error
    return {
      availableCredits: 5,
      lastResetDate: new Date().toISOString()
    };
  }
}

// Use a credit for scan prescription feature
export async function useCredit(): Promise<boolean> {
  try {
    const userCredits = await getUserCredits();
    
    // Check if user has credits available
    if (userCredits.availableCredits <= 0) {
      return false;
    }
    
    // Update credits
    userCredits.availableCredits -= 1;
    await AsyncStorage.setItem(USER_CREDITS_KEY, JSON.stringify(userCredits));
    return true;
  } catch (error) {
    console.error("Error using credit:", error);
    return false;
  }
}
