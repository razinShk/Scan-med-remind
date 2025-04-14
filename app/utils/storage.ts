// Look for the function that processes medication creation or updates

// Find a function that handles medication creation from scanned text
export function parseFrequencyToTimes(frequency: string): string[] {
  // Default times
  const DEFAULT_MORNING_TIME = "09:00";
  const DEFAULT_AFTERNOON_TIME = "13:00";
  const DEFAULT_EVENING_TIME = "18:00";
  const DEFAULT_NIGHT_TIME = "21:00";
  
  // Initialize times array
  const times: string[] = [];
  
  // Check if frequency is empty or undefined
  if (!frequency) {
    return [DEFAULT_MORNING_TIME]; // Default to morning if no information
  }
  
  // Convert to lowercase for easier matching
  const frequencyLower = frequency.toLowerCase();
  
  // Check for specific timing patterns
  if (frequencyLower.includes("morning") || frequencyLower.includes("am")) {
    times.push(DEFAULT_MORNING_TIME);
  }
  
  if (frequencyLower.includes("afternoon") || frequencyLower.includes("noon")) {
    times.push(DEFAULT_AFTERNOON_TIME);
  }
  
  if (frequencyLower.includes("evening")) {
    times.push(DEFAULT_EVENING_TIME);
  }
  
  if (frequencyLower.includes("night") || frequencyLower.includes("pm")) {
    times.push(DEFAULT_NIGHT_TIME);
  }
  
  // If no specific times were found but frequency mentions a number of times per day
  if (times.length === 0) {
    if (frequencyLower.includes("once") || frequencyLower.includes("1 time") || frequencyLower.includes("1 day")) {
      // If just "once daily" with no specific time, default to morning
      times.push(DEFAULT_MORNING_TIME);
    } else if (frequencyLower.includes("twice") || frequencyLower.includes("2 times") || frequencyLower.includes("bid")) {
      // Twice daily = morning and evening
      times.push(DEFAULT_MORNING_TIME, DEFAULT_NIGHT_TIME);
    } else if (frequencyLower.includes("three") || frequencyLower.includes("3 times") || frequencyLower.includes("tid")) {
      // Three times daily = morning, afternoon, and night
      times.push(DEFAULT_MORNING_TIME, DEFAULT_AFTERNOON_TIME, DEFAULT_NIGHT_TIME);
    } else if (frequencyLower.includes("four") || frequencyLower.includes("4 times") || frequencyLower.includes("qid")) {
      // Four times daily = every 6 hours
      times.push("06:00", "12:00", "18:00", "00:00");
    } else {
      // If we still couldn't determine times, default to morning
      times.push(DEFAULT_MORNING_TIME);
    }
  }
  
  return times;
}

// Search for a function that processes the scanned medication data and update it to use our new function 