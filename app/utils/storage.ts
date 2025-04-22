import AsyncStorage from '@react-native-async-storage/async-storage';

// Default meal times if not set by user
const DEFAULT_MEAL_TIMES = {
  breakfast: '09:00',
  lunch: '13:00',
  eveningSnacks: '17:00',
  dinner: '20:00',
};

export async function getMealTimes() {
  try {
    const savedMealTimes = await AsyncStorage.getItem('@mealTimes');
    return savedMealTimes ? JSON.parse(savedMealTimes) : DEFAULT_MEAL_TIMES;
  } catch (error) {
    console.error('Error getting meal times:', error);
    return DEFAULT_MEAL_TIMES;
  }
}

// Look for the function that processes medication creation or updates

// Find a function that handles medication creation from scanned text
export function parseFrequencyToTimes(frequency: string): Promise<string[]> {
  return new Promise(async (resolve) => {
    try {
      // Get user's meal times
      const mealTimes = await getMealTimes();
      
      // Initialize times array
      let times: string[] = [];
      
      // Check if frequency is empty or undefined
      if (!frequency) {
        resolve([mealTimes.breakfast]); // Default to breakfast if no information
        return;
      }
      
      // Convert to lowercase for easier matching
      const frequencyLower = frequency.toLowerCase();
      
      // Check for specific timing patterns
      if (frequencyLower.includes('once') || frequencyLower.includes('1 time') || frequencyLower.includes('1 day')) {
        times = [mealTimes.breakfast];
      } else if (frequencyLower.includes('twice') || frequencyLower.includes('2 times') || frequencyLower.includes('bid')) {
        times = [mealTimes.breakfast, mealTimes.dinner];
      } else if (frequencyLower.includes('three') || frequencyLower.includes('3 times') || frequencyLower.includes('tid')) {
        times = [mealTimes.breakfast, mealTimes.lunch, mealTimes.dinner];
      } else if (frequencyLower.includes('four') || frequencyLower.includes('4 times') || frequencyLower.includes('qid')) {
        times = [mealTimes.breakfast, mealTimes.lunch, mealTimes.eveningSnacks, mealTimes.dinner];
      } else {
        times = [mealTimes.breakfast]; // Default to breakfast
      }
      
      resolve(times);
    } catch (error) {
      console.error('Error parsing frequency to times:', error);
      resolve([DEFAULT_MEAL_TIMES.breakfast]); // Fallback to default breakfast time
    }
  });
}

// Search for a function that processes the scanned medication data and update it to use our new function 