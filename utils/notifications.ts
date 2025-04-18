import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Medication } from "./storage";
import * as Speech from 'expo-speech';
import AsyncStorage from "@react-native-async-storage/async-storage";

// Keep track of active notification subscription
let notificationSubscription: Notifications.Subscription | null = null;

// Use a debounce mechanism to prevent multiple voice announcements
const voiceAnnouncements = new Map<string, number>();
const DEBOUNCE_TIME = 10000; // 10 seconds debounce

// Configure notification handler with voice announcements
export const configureNotifications = () => {
  console.log("Configuring notification handler with voice announcements");
  
  // Remove any existing notification subscription
  if (notificationSubscription) {
    notificationSubscription.remove();
    notificationSubscription = null;
  }

  // Remove any existing notification handler
  Notifications.setNotificationHandler(null);
  
  // Set up notification behavior
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      console.log("Received notification:", notification.request.content);
      
      // Return display configuration without handling voice here
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });
  
  // Set up a single foreground notification listener that handles voice announcements
  notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
    const identifier = notification.request.identifier;
    const data = notification.request.content.data;
    console.log("Foreground notification received:", identifier);
    
    // Handle voice announcements here (only in foreground listener)
    if (data && data.medicationName) {
      // Create a unique key for this medication/time combination
      const announcementKey = `${data.medicationId}-${data.time}`;
      const now = Date.now();
      
      // Check if we've announced this medication recently
      const lastAnnounced = voiceAnnouncements.get(announcementKey) || 0;
      if (now - lastAnnounced > DEBOUNCE_TIME) {
        // It's been more than our debounce time, proceed with announcement
        voiceAnnouncements.set(announcementKey, now);
        
        const speechText = `It's time to take your ${data.medicationName} medication, ${data.medicationDosage || ''}`;
        console.log("Speaking medication reminder:", speechText);
        
        try {
          // Stop any ongoing speech
          Speech.stop();
          // Start new speech
          Speech.speak(speechText, {
            language: 'en',
            pitch: 1.0,
            rate: 0.9,
          });
        } catch (error) {
          console.error("Error speaking medication reminder:", error);
        }
      } else {
        console.log("Skipping duplicate voice announcement for:", announcementKey);
      }
    }
  });
};

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  let token: string | null = null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push token: permission not granted");
      return null;
    }

    // Get push token - remove projectId parameter which causes type error
    const response = await Notifications.getExpoPushTokenAsync();
    token = response.data;
    console.log("Expo push token:", token);

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Medication Reminders",
        description: "Reminds you to take your medications on time",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1a8e2d",
        sound: "default"
      });
      console.log("Android notification channel configured");
    }

    return token;
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
  }
}

export async function scheduleMedicationReminder(
  medication: Medication
): Promise<string[] | undefined> {
  if (!medication.reminderEnabled) {
    console.log(`Reminders not enabled for medication: ${medication.name}`);
    return;
  }

  try {
    const identifiers: string[] = [];
    console.log(`Scheduling reminders for ${medication.name} at times:`, medication.times);

    // Schedule notifications for each time
    for (const time of medication.times) {
      const [hours, minutes] = time.split(":").map(Number);
      console.log(`Setting reminder for ${medication.name} at ${hours}:${minutes}`);
      
      // Create a Date object for comparing with current time
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);
      
      // If this time has already passed today, schedule it for tomorrow
      const now = new Date();
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
        console.log(`Time already passed today, scheduling for tomorrow at ${hours}:${minutes}`);
      }
      
      // Create the trigger based on platform
      let trigger: any;
      
      if (Platform.OS === 'ios') {
        trigger = {
          type: 'calendar',
          repeats: true,
          dateComponents: {
            hour: hours,
            minute: minutes,
          },
        };
      } else {
        // Android trigger needs the type field too for Expo SDK 52+
        trigger = {
          hour: hours,
          minute: minutes,
          repeats: true,
          type: 'daily',
        };
      }
      
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Medication Reminder",
          body: `It's time to take ${medication.name} (${medication.dosage})`,
          data: {
            medicationId: medication.id,
            time,
            medicationName: medication.name,
            medicationDosage: medication.dosage
          },
          sound: true,
          priority: 'high',
        },
        trigger,
      });
      
      identifiers.push(identifier);
      console.log(`Successfully scheduled reminder for ${medication.name} at ${time}, ID: ${identifier}`);
      
      // Save this notification ID with its scheduled time for reference
      await AsyncStorage.setItem(
        `notification_${identifier}`,
        JSON.stringify({
          medicationId: medication.id,
          medicationName: medication.name,
          time: time,
          scheduled: new Date().toISOString()
        })
      );
    }

    return identifiers.length > 0 ? identifiers : undefined;
  } catch (error) {
    console.error("Error scheduling medication reminder:", error);
    return undefined;
  }
}

// Function to list all scheduled notifications for debugging
export async function listAllScheduledNotifications(): Promise<void> {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`Found ${scheduledNotifications.length} scheduled notifications:`);
    
    scheduledNotifications.forEach((notification, index) => {
      const { identifier, content, trigger } = notification;
      console.log(`${index + 1}. ID: ${identifier}`);
      console.log(`   Title: ${content.title}`);
      console.log(`   Body: ${content.body}`);
      console.log(`   Data:`, content.data);
      console.log(`   Trigger:`, trigger);
    });
  } catch (error) {
    console.error("Error listing notifications:", error);
  }
}

export async function scheduleRefillReminder(
  medication: Medication
): Promise<string | undefined> {
  if (!medication.refillReminder) return;

  try {
    if (medication.currentSupply <= medication.refillAt) {
      console.log(`Scheduling refill reminder for ${medication.name}`);
      
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Refill Reminder",
          body: `Your ${medication.name} supply is running low. Current supply: ${medication.currentSupply}`,
          data: { medicationId: medication.id, type: "refill" },
        },
        trigger: null, // Show immediately
      });

      console.log(`Scheduled refill reminder for ${medication.name}, ID: ${identifier}`);
      return identifier;
    }
  } catch (error) {
    console.error("Error scheduling refill reminder:", error);
    return undefined;
  }
}

export async function cancelMedicationReminders(
  medicationId: string
): Promise<void> {
  try {
    console.log(`Cancelling reminders for medication ID: ${medicationId}`);
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    console.log(`Found ${scheduledNotifications.length} total scheduled notifications`);
    let cancelCount = 0;
    
    for (const notification of scheduledNotifications) {
      const data = notification.content.data as {
        medicationId?: string;
      } | null;
      
      if (data?.medicationId === medicationId) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
        cancelCount++;
        console.log(`Cancelled notification: ${notification.identifier}`);
      }
    }
    
    console.log(`Cancelled ${cancelCount} notifications for medication ID: ${medicationId}`);
  } catch (error) {
    console.error("Error canceling medication reminders:", error);
  }
}

export async function updateMedicationReminders(
  medication: Medication
): Promise<void> {
  try {
    console.log(`Updating reminders for medication: ${medication.name}`);
    
    // Cancel existing reminders
    await cancelMedicationReminders(medication.id);

    // Schedule new reminders
    if (medication.reminderEnabled) {
      const notificationIds = await scheduleMedicationReminder(medication);
      console.log(`Scheduled ${notificationIds?.length || 0} new reminders`);
    } else {
      console.log("Reminders not enabled for this medication");
    }
    
    // Schedule refill reminder if enabled
    if (medication.refillReminder) {
      await scheduleRefillReminder(medication);
    }
    
    // Debug: list all scheduled notifications after update
    await listAllScheduledNotifications();
  } catch (error) {
    console.error("Error updating medication reminders:", error);
  }
}