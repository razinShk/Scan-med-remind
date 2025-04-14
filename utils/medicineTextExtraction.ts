import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { addMedication, Medication } from './storage';
import { scheduleMedicationReminder, scheduleRefillReminder } from './notifications';

// Simple ID generator function
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Define a type for the notification trigger
interface DailyTrigger {
  type: 'daily';
  hour: number;
  minute: number;
  repeats: boolean;
}

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timing: string[];
  specialInstructions: string;
  duration: string;
}

interface Reminder {
  id: string;
  medicineName: string;
  time: string;
  enabled: boolean;
}

// Add a function to convert Medicine object to the app's Medication format
export function convertToAppMedication(medicine: Medicine): any {
  // Generate a random color from a predefined list
  const colors = ['#4CAF50', '#2196F3', '#F44336', '#FF9800', '#9C27B0', '#3F51B5', '#009688'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  
  // Parse frequency to get times array, ensuring it's never undefined
  let times = parseFrequencyToTimes(
    medicine.frequency, 
    Array.isArray(medicine.timing) ? medicine.timing[0] : medicine.timing,
    medicine.dosage // Pass the dosage information to help determine frequency
  );
  
  console.log(`For medicine ${medicine.name}, frequency "${medicine.frequency}", dosage "${medicine.dosage}", parsed times: ${JSON.stringify(times)}`);
  
  // Safety check to ensure times is always an array
  if (!times || !Array.isArray(times) || times.length === 0) {
    console.log(`No valid times found for ${medicine.name}, using default time`);
    times = ['09:00']; // Default time if none could be determined
  }
  
  // Extract duration in days
  let durationDays = 30; // default to 30 days if not specified
  if (medicine.duration && medicine.duration !== 'No information available') {
    if (medicine.duration.toLowerCase().includes('month')) {
      // Convert month to days (approximate)
      const monthMatch = medicine.duration.match(/(\d+)\s*month/i);
      if (monthMatch && monthMatch[1]) {
        durationDays = parseInt(monthMatch[1]) * 30;
      }
    } else {
      // Try to extract number of days directly
      const daysMatch = medicine.duration.match(/(\d+)/);
      if (daysMatch && daysMatch[1]) {
        durationDays = parseInt(daysMatch[1]);
      }
    }
  }
  
  // Calculate doses per day based on frequency
  let dosesPerDay = times.length;
  
  // Handle special case for 1-2 times daily (taking average for supply calculation)
  if (medicine.frequency && medicine.frequency.toLowerCase().includes('1-2 times')) {
    dosesPerDay = 1.5; // Average of 1 and 2
  }
  
  // Estimate total supply based on duration and frequency
  const totalSupply = Math.ceil(durationDays * dosesPerDay);
  
  // Use descriptive medicine details for better user experience
  const durationText = medicine.duration && medicine.duration !== 'No information available' 
    ? medicine.duration 
    : '30 days';
  
  const medication = {
    id: generateId(),
    name: medicine.name || 'Unnamed Medication',
    dosage: medicine.dosage || 'No dosage specified',
    times: times,
    startDate: new Date().toISOString(),
    duration: durationText,
    color: randomColor,
    reminderEnabled: true,
    currentSupply: totalSupply,
    totalSupply: totalSupply,
    refillAt: Math.ceil(totalSupply * 0.2), // Set refill reminder at 20% of total supply
    refillReminder: true
  };
  
  console.log(`Created app medication: ${medication.name} with times: ${medication.times.join(', ')}`);
  return medication;
}

function parseFrequencyToTimes(frequency: string, timing?: string, dosage?: string): string[] {
  // Define standard times for different periods of the day
  const MORNING_TIME = '09:00';
  const AFTERNOON_TIME = '13:00';
  const EVENING_TIME = '18:00';
  const NIGHT_TIME = '21:00';
  
  const times: string[] = [];
  
  // Combine frequency and dosage for more accurate timing information
  const combinedInfo = `${frequency || ''} ${dosage || ''}`.toLowerCase();
  
  // Handle empty or undefined frequency
  if (!combinedInfo.trim()) {
    return [MORNING_TIME]; // Default to morning if no information
  }
  
  // Check for hourly patterns (e.g., "4 hourly", "6 hourly", "8 hourly", "12 hourly")
  const hourlyMatch = combinedInfo.match(/(\d+)\s*hourly/i);
  if (hourlyMatch && hourlyMatch[1]) {
    const hoursInterval = parseInt(hourlyMatch[1]);
    
    // Calculate how many doses per day based on the interval
    const dosesPerDay = Math.floor(24 / hoursInterval);
    console.log(`Hourly pattern detected: ${hoursInterval} hourly = ${dosesPerDay} doses per day`);
    
    // Set appropriate times based on standard medical practice
    if (hoursInterval === 6 || dosesPerDay === 4) {
      // 6 hourly = 4 times a day
      return ['06:00', '12:00', '18:00', '00:00'];
    } else if (hoursInterval === 8 || dosesPerDay === 3) {
      // 8 hourly = 3 times a day
      return ['08:00', '16:00', '00:00'];
    } else if (hoursInterval === 12 || dosesPerDay === 2) {
      // 12 hourly = 2 times a day
      return ['09:00', '21:00'];
    } else if (hoursInterval === 24 || dosesPerDay === 1) {
      // 24 hourly = once a day
      return [MORNING_TIME];
    } else {
      // For other intervals, distribute evenly throughout the day
      const result = [];
      const startHour = 8; // Start at 8 AM
      for (let i = 0; i < dosesPerDay; i++) {
        const hour = (startHour + (i * hoursInterval)) % 24;
        result.push(`${hour.toString().padStart(2, '0')}:00`);
      }
      return result;
    }
  }
  
  // Check for explicit time count in dosage (e.g., "1 ml - 1 ml" indicates twice daily)
  const doseCountMatch = dosage?.match(/\d+\s*(?:ml|mg|units)(?:\s*-\s*\d+\s*(?:ml|mg|units))+/gi);
  if (doseCountMatch) {
    const doseCount = (doseCountMatch[0].match(/-/g) || []).length + 1;
    console.log(`Dose pattern detected in dosage: ${doseCount} times per day from "${dosage}"`);
    
    if (doseCount === 2) {
      return [MORNING_TIME, NIGHT_TIME]; // Twice daily
    } else if (doseCount === 3) {
      return [MORNING_TIME, AFTERNOON_TIME, NIGHT_TIME]; // Three times daily
    } else if (doseCount === 4) {
      return ['06:00', '12:00', '18:00', '00:00']; // Four times daily
    }
    // For other counts, continue with regular parsing
  }
  
  const frequencyLower = combinedInfo;
  
  // First check for common time designations in the frequency text
  if (frequencyLower.includes('morning') && frequencyLower.includes('night')) {
    times.push(MORNING_TIME, NIGHT_TIME);
  } else if (frequencyLower.includes('morning') && frequencyLower.includes('evening')) {
    times.push(MORNING_TIME, EVENING_TIME);
  } else if (frequencyLower.includes('morning') && frequencyLower.includes('afternoon')) {
    times.push(MORNING_TIME, AFTERNOON_TIME);
  } else if (frequencyLower === 'morning') {
    times.push(MORNING_TIME);
  } else if (frequencyLower === 'afternoon') {
    times.push(AFTERNOON_TIME);
  } else if (frequencyLower === 'evening') {
    times.push(EVENING_TIME);
  } else if (frequencyLower === 'night' || frequencyLower === '1 night') {
    times.push(NIGHT_TIME);
  } else {
    // Handle medical abbreviations and general frequency descriptions
    if (frequencyLower.includes('od') || frequencyLower.includes('qd') || frequencyLower.includes('1-0-0') || 
        frequencyLower.includes('once') || frequencyLower.includes('1 time') || 
        frequencyLower.includes('once daily') || frequencyLower.includes('1 day') ||
        frequencyLower.includes('once a day')) {
      times.push(MORNING_TIME);
    } else if (frequencyLower.includes('bid') || frequencyLower.includes('bd') || frequencyLower.includes('1-0-1') || 
        frequencyLower.includes('twice') || frequencyLower.includes('2 times') || 
        frequencyLower.includes('twice daily') || frequencyLower.includes('b.i.d')) {
      times.push(MORNING_TIME, NIGHT_TIME);
    } else if (frequencyLower.includes('tid') || frequencyLower.includes('tds') || frequencyLower.includes('1-1-1') || 
        frequencyLower.includes('three') || frequencyLower.includes('3 times') || frequencyLower.includes('t.i.d')) {
      times.push(MORNING_TIME, AFTERNOON_TIME, NIGHT_TIME);
    } else if (frequencyLower.includes('qid') || frequencyLower.includes('four') || frequencyLower.includes('4 times') ||
        frequencyLower.includes('q.i.d')) {
      times.push('06:00', '12:00', '18:00', '00:00');
  } else if (frequencyLower.includes('1-2 times')) {
    // Special case for "1-2 times daily" - add both morning and night times
      times.push(MORNING_TIME, NIGHT_TIME);
  } else {
      // Check for specific time mentions
    if (frequencyLower.includes('morning')) {
        times.push(MORNING_TIME);
    }
    if (frequencyLower.includes('afternoon')) {
        times.push(AFTERNOON_TIME);
      }
      if (frequencyLower.includes('evening')) {
        times.push(EVENING_TIME);
      }
      if (frequencyLower.includes('night')) {
        times.push(NIGHT_TIME);
      }
    }
  }
  
  // If no specific times found after all checks, set a default time
  if (times.length === 0) {
    times.push(MORNING_TIME);
  }

  // Adjust times based on timing instructions (after/before food)
  if (timing && timing.toLowerCase().includes('after food')) {
    return times.map(time => {
      const [hours, minutes] = time.split(':').map(Number);
      // Add 30 minutes to the base time for after food
      const newMinutes = (minutes + 30) % 60;
      const newHours = hours + (minutes + 30 >= 60 ? 1 : 0);
      return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    });
  } else if (timing && timing.toLowerCase().includes('before food')) {
    return times.map(time => {
      const [hours, minutes] = time.split(':').map(Number);
      // Subtract 30 minutes from the base time for before food
      const newMinutes = (minutes + 30) % 60;
      const newHours = (hours + 24 - 1 + Math.floor((minutes - 30 + 60) / 60)) % 24;
      return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    });
  }
  
  return times;
}

async function createRemindersForMedicine(medicine: Medicine) {
  const times = parseFrequencyToTimes(
    medicine.frequency, 
    Array.isArray(medicine.timing) ? medicine.timing[0] : medicine.timing,
    medicine.dosage // Pass the dosage information to help determine frequency
  );
  const reminders: Reminder[] = [];

  for (const time of times) {
    const reminder: Reminder = {
      id: generateId(),
      medicineName: medicine.name,
      time,
      enabled: true
    };
    reminders.push(reminder);
  }

  return reminders;
}

function parseMedicineDetails(text: string): Medicine[] {
  const medicines: Medicine[] = [];
  const sections = text.split(/###\s+Medicine\s+\d+/).filter(section => section.trim());

  for (const section of sections) {
    const lines = section.split('\n').filter(line => line.trim());
    const medicine: Partial<Medicine> = {};

    for (const line of lines) {
      const [key, value] = line.split(':').map(part => part.trim());
      
      if (key.includes('Name')) {
        medicine.name = value;
      } else if (key.includes('Dosage')) {
        medicine.dosage = value;
      } else if (key.includes('Frequency')) {
        medicine.frequency = value;
      } else if (key.includes('Timing')) {
        medicine.timing = value === 'No information available' ? [] : [value];
      } else if (key.includes('Special Instructions')) {
        medicine.specialInstructions = value;
      } else if (key.includes('Duration')) {
        medicine.duration = value;
      }
    }

    if (medicine.name) {
      medicines.push({
        id: generateId(), // Use our custom ID generator
        name: medicine.name,
        dosage: medicine.dosage || 'No information available',
        frequency: medicine.frequency || 'once daily',
        timing: medicine.timing || [],
        specialInstructions: medicine.specialInstructions || 'No information available',
        duration: medicine.duration || 'No information available'
      });
    }
  }

  return medicines;
}

export async function extractMedicineData(
  base64Image: string
): Promise<{ extractedText: string; medicines: Medicine[] }> {
  try {
    const cleanBase64 = base64Image.replace(
      /^data:image\/(png|jpeg|jpg);base64,/,
      ''
    );

    // Create headers for API call
    const headers: HeadersInit = {
      Authorization:
        'Bearer tgp_v1_WX9cH41Tp2NSjVDe9bxP3KpFGudmUb958K9zxq0H1_Q',
      'Content-Type': 'application/json',
    };

    if (Platform.OS === 'web') {
      headers['Access-Control-Allow-Origin'] = '*';
      headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    }

    console.log('Making API request to extract medicine data...');
    
    // Make the API request to extract medicine data from the image
    const response = await fetch(
      'https://api.together.xyz/v1/chat/completions',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extract and format medicine details from prescription images in a structured markdown format.

For each medicine found in the prescription, format the output as follows:

### Medicine 1
- **Name**: [medicine name]
- **Dosage**: [dosage]
- **Frequency**: [frequency]
- **Timing**: [timing or "No information available"]
- **Special Instructions**: [instructions or "No information available"]
- **Duration**: [duration or "No information available"]

### Medicine 2
...and so on

⚠️ Notes:
- Ignore patient details, diagnosis, and doctor/hospital info.
- Include all medicines found in the prescription.
- If any information is missing, write "No information available".
- DO NOT add any additional text outside this structured format.`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${cleanBase64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 1024,
        }),
      }
    );

    // Handle API response errors
    if (!response.ok) {
      const errorData = await response.text();
      console.error('API request failed:', response.status, errorData);
      throw new Error(`API request failed: ${response.status} - ${errorData}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      // Parse JSON response
      const data = await response.json();
      console.log('API response received');

      if (!data.choices?.[0]?.message?.content) {
        console.error('Invalid API response format:', data);
        throw new Error('Invalid response format from API');
      }

      // Extract text and parse medicine details
      const extractedText = data.choices[0].message.content;
      console.log('Extracted text:', extractedText);
      
      const medicines = parseMedicineDetails(extractedText);
      console.log('Parsed medicines:', medicines);
      
      // Create reminders for each medicine
      console.log('Creating reminders for medicines...');
      for (const medicine of medicines) { 
        await createRemindersForMedicine(medicine);
      }
      console.log('Reminders created successfully');

      return { extractedText, medicines };
    } else {
      // Handle unexpected response format
      const textData = await response.text();
      console.error('Unexpected response format:', contentType, textData);
      throw new Error(`Unexpected response format: ${contentType || 'unknown'}`);
    }
  } catch (error) {
    console.error('Error in text extraction:', error);
    throw error;
  }
}

export async function processMedicineText(text: string) {
  try {
    const medicines = parseMedicineDetails(text);
    
    if (medicines.length === 0) {
      return { success: false, message: "No medicines found in the text." };
    }

    console.log("Parsed medicines data:", JSON.stringify(medicines, null, 2));
    
    const appMedications = medicines.map(convertToAppMedication);
    
    console.log("Converted to app medications:", JSON.stringify(appMedications, null, 2));
    
    // Save medications to storage
    for (const medication of appMedications) {
      await addMedication(medication);
      console.log(`Added medication ${medication.name} to storage`);
    }
    
    // Schedule reminders for each medication
    for (const medication of appMedications) {
      if (medication.reminderEnabled) {
        const reminderIds = await scheduleMedicationReminder(medication);
        console.log(`Scheduled reminders for ${medication.name}:`, reminderIds);
      }
      if (medication.refillReminder) {
        const refillId = await scheduleRefillReminder(medication);
        console.log(`Scheduled refill reminder for ${medication.name}:`, refillId);
      }
    }

    return { 
      success: true, 
      message: `Successfully added ${medicines.length} medication(s) with reminders.`,
      count: medicines.length,
      medications: appMedications // Return the created medications for display
    };
  } catch (error) {
    console.error("Error processing medicine text:", error);
    return { 
      success: false, 
      message: "An error occurred while processing the text." 
    };
  }
}