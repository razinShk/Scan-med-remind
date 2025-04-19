import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  Alert,
  AppState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import * as Speech from 'expo-speech';
import {
  getMedications,
  Medication,
  getTodaysDoses,
  recordDose,
  DoseHistory,
  deleteMedication,
  updateMedication
} from "../utils/storage";
import { useFocusEffect } from "@react-navigation/native";
import {
  registerForPushNotificationsAsync,
  scheduleMedicationReminder,
  cancelMedicationReminders,
  listAllScheduledNotifications,
  updateMedicationReminders,
} from "../utils/notifications";
import { ROUTES } from './services/NavigationHelper';
import { syncSharedMedications } from './services/NurseConnectionService';
import { useAuth } from './services/AuthContext';

const { width } = Dimensions.get("window");

// Create animated circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const QUICK_ACTIONS = [
  {
    icon: "add-circle-outline" as const,
    label: "Add\nMedication",
    route: "/medications/add" as const,
    color: "#1976D2",
    gradient: ["#42A5F5", "#1976D2"] as [string, string],
  },
  {
    icon: "scan-outline" as const,
    label: "Scan\nPrescription",
    route: "/scan" as const,
    color: "#9C27B0",
    gradient: ["#BA68C8", "#9C27B0"] as [string, string],
  },
  {
    icon: "calendar-outline" as const,
    label: "Calendar\nView",
    route: "/calendar" as const,
    color: "#1976D2",
    gradient: ["#2196F3", "#1976D2"] as [string, string],
  },
  {
    icon: "people-outline" as const,
    label: "Nurse\nConnect",
    route: "/nurse" as const,
    color: "#0097A7",
    gradient: ["#00BCD4", "#0097A7"] as [string, string],
  },
  {
    icon: "time-outline" as const,
    label: "History\nLog",
    route: "/history" as const,
    color: "#C2185B",
    gradient: ["#E91E63", "#C2185B"] as [string, string],
  },
  {
    icon: "medical-outline" as const,
    label: "Refill\nTracker",
    route: "/refills" as const,
    color: "#E64A19",
    gradient: ["#FF5722", "#E64A19"] as [string, string],
  },
];

// Replace CircularProgress with MedicationClock component
interface MedicationClockProps {
  medications: Medication[];
  doseHistory: DoseHistory[];
  progress: number;
  totalDoses: number;
  completedDoses: number;
}

function MedicationClock({
  medications,
  doseHistory,
  progress,
  totalDoses,
  completedDoses,
}: MedicationClockProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [handAngles, setHandAngles] = useState({ hour: 0, minute: 0 });
  const [selectedTimeKey, setSelectedTimeKey] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Animation value for pulsing effect
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Start pulse animation when component mounts
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Use this effect to calculate accurate hand angles
  useEffect(() => {
    const updateHandAngles = () => {
      const date = new Date();
      const hours = date.getHours() % 12;
      const minutes = date.getMinutes();
      const seconds = date.getSeconds();
      
      // Include seconds in calculations for smoother movement
      // Hour: (hour * 30) + (minute * 0.5) + (second * 0.00833)
      // Minute: (minute * 6) + (second * 0.1)
      const hourAngle = (hours * 30) + (minutes * 0.5) + (seconds * 0.00833) - 90;
      const minuteAngle = (minutes * 6) + (seconds * 0.1) - 90;
      
      setHandAngles({ hour: hourAngle, minute: minuteAngle });
      setCurrentTime(date); // Update current time for display
    };
    
    // Update immediately
    updateHandAngles();
    
    // Then update every second
    const intervalId = setInterval(updateHandAngles, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Force a re-render when a dot is selected
  useEffect(() => {
    // Log the selected time for debugging
    if (selectedTimeKey) {
      console.log('Selected time dot:', selectedTimeKey);
      console.log('Forcing re-render of medication dots');
    }
  }, [selectedTimeKey]);

  // Debugging for render
  if (selectedTimeKey) {
    console.log('Rendering selected medication time:', selectedTimeKey);
  }

  // Calculate label position to ensure it stays on screen
  const calculateLabelPosition = (x: number, y: number, radius: number) => {
    // Calculate the angle in degrees (0 is right, 90 is bottom, 180 is left, 270 is top)
    const angleDeg = Math.atan2(y, x) * (180 / Math.PI);
    
    // Initialize position object
    const position: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
      flexDirection?: "column" | "column-reverse";
      alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
    } = {
      flexDirection: "column", // Default stack direction
      alignItems: "flex-start" // Default alignment
    };
    
  // More precise positioning based on hour angle
  // 12 o'clock
  if (angleDeg < -75 && angleDeg >= -105) {
    position.bottom = Math.abs(y) - 60; // Closer to clock
    position.left = x - 40; // Center horizontally
    position.flexDirection = "column-reverse"; // Stack upward
  }
  // 1 o'clock
  else if (angleDeg < -45 && angleDeg >= -75) {
    position.bottom = Math.abs(y) - 60;
    position.left = x - 20; // Closer to clock
    position.flexDirection = "column-reverse";
  }
  // 2 o'clock
  else if (angleDeg < -15 && angleDeg >= -45) {
    position.left = x - 55; // Closer to clock
    position.top = y + 35;
  }
  // 3 o'clock
  else if (angleDeg >= -15 && angleDeg < 15) {
    position.left = x - 62; // Closer to clock
    position.top = y - 5;
  }
  // 4 o'clock
  else if (angleDeg >= 15 && angleDeg < 45) {
    position.left = x - 50; // Closer to clock
    position.top = y - 35;
  }
  // 5 o'clock
  else if (angleDeg >= 45 && angleDeg < 75) {
    position.left = x - 35; // Closer to clock
    position.top = y - 50;
  }
  // 6 o'clock
  else if (angleDeg >= 75 && angleDeg < 105) {
    position.top = y - 60; // Closer to clock
    position.left = x - 40; // Center horizontally
  }
  // 7 o'clock
  else if (angleDeg >= 105 && angleDeg < 135) {
    position.top = y - 60; // Closer to clock
    position.right = Math.abs(x) - 25;
  }
  // 8 o'clock
  else if (angleDeg >= 135 && angleDeg < 165) {
    position.right = Math.abs(x) - 60; // Closer to clock
    position.top = y - 25;
  }
  // 9 o'clock
  else if ((angleDeg >= 165 && angleDeg <= 180) || (angleDeg >= -180 && angleDeg < -165)) {
    position.right = Math.abs(x) - 60; // Closer to clock
    position.top = y - 5;
  }
  // 10 o'clock
  else if (angleDeg < -135 && angleDeg >= -165) {
    position.right = Math.abs(x) - 60; // Closer to clock
    position.top = y + 30;
  }
  // 11 o'clock
  else if (angleDeg < -105 && angleDeg >= -135) {
    position.bottom = Math.abs(y) - 65; // Closer to clock
    position.right = Math.abs(x) - 15;
    position.flexDirection = "column-reverse";
  }
  
  return position;
};

  // Helper function to convert 24-hour time format to 12-hour format with AM/PM
  const formatTo12Hour = (time24: string): string => {
    // Parse hours and minutes from 24-hour time format (HH:MM)
    const [hours24, minutes] = time24.split(':').map(Number);
    
    // Convert to 12-hour format
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12; // 0 should be displayed as 12
    
    // Format as HH:MM AM/PM
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <View style={styles.timeClockContainer}>
      {/* Clock outer ring */}
      <View style={styles.clockOuter}>
        <View style={styles.clockInner}>
          <View style={styles.clockCenter}>
            <Text style={styles.currentTimeText}>
              {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})}
            </Text>
            <Text style={styles.progressText}>{Math.round(progress * 100)}% Done</Text>
            
            {/* Debug info - temporary */}
            <Text style={styles.debugTimeText}>
              {`${currentTime.getHours()}:${currentTime.getMinutes()}:${currentTime.getSeconds()}`}
            </Text>
          </View>
                
          {/* Hour numbers */}
          {[...Array(12)].map((_, i) => {
            const hour = i === 0 ? 12 : i;
            const angle = i * 30;
            const hourRadians = (angle - 90) * (Math.PI / 180);
            const hourRadius = 75;
            const x = hourRadius * Math.cos(hourRadians);
            const y = hourRadius * Math.sin(hourRadians);
            
            return (
              <Text 
                key={`hour-${i}`} 
                style={[
                  styles.hourNumber,
                  {
                    transform: [
                      { translateX: x },
                      { translateY: y }
                    ]
                  }
                ]}
              >
                {hour}
              </Text>
            );
          })}
          
          {/* Hour markers */}
          {[...Array(12)].map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.hourMarker, 
                { transform: [{ rotate: `${i * 30}deg` }] }
              ]}
            />
          ))}
          
          {/* Medication markers */}
          {(() => {
            // Group medications by their time slots
            const timeToMeds = new Map<string, Array<{med: Medication, taken: boolean, isTimeToTake: boolean}>>();

            // Process all medications and organize by time
            medications.forEach((med) => {
              med.times.forEach((time) => {
                const [hours, minutes] = time.split(':').map(Number);
                
                // Calculate if it's time to take this medication
                const medTime = new Date();
                medTime.setHours(hours, minutes, 0, 0);
                
                // Calculate time difference in minutes
                const nowTime = new Date(currentTime);
                const timeDiffMinutes = Math.abs(
                  (medTime.getHours() * 60 + medTime.getMinutes()) - 
                  (nowTime.getHours() * 60 + nowTime.getMinutes())
                );
                
                // Check if it's within 15 minutes or if the hours and minutes match
                const isTimeToTake = timeDiffMinutes <= 15 || 
                  (nowTime.getHours() === hours && nowTime.getMinutes() === minutes);
                
                const taken = doseHistory.some(
                  dose => dose.medicationId === med.id && 
                    new Date(dose.timestamp).getHours() === hours &&
                    new Date(dose.timestamp).getMinutes() === minutes
                );

                // Create a unique key for this time
                const timeKey = `${hours}:${minutes}`;
                
                // Add to map of medications by time
                if (!timeToMeds.has(timeKey)) {
                  timeToMeds.set(timeKey, []);
                }
                timeToMeds.get(timeKey)!.push({ med, taken, isTimeToTake });
              });
            });

            return Array.from(timeToMeds.entries()).map(([timeKey, meds]) => {
              const [hours, minutes] = timeKey.split(':').map(Number);
              
              // Calculate angle based on 12-hour clock
              const hour12 = hours % 12 || 12;
              const minuteAngle = minutes / 60 * 30; // Convert minutes to degrees
              const angle = (hour12 * 30) + minuteAngle;
              
              // Convert angle to radians for positioning
              const radians = ((angle - 90) * Math.PI) / 180; // Start from 12 o'clock
              const radius = 85; // Position dots near the edge
              const x = radius * Math.cos(radians);
              const y = radius * Math.sin(radians);
                
              // Use the first medication's color for the dot
              const medicationColor = meds[0].med.color || 
                ['#FF5252', '#7B1FA2', '#1976D2', '#388E3C', '#FFA000'][0];
              
              // Determine if any medication at this time needs to be taken now
              const anyTimeToTake = meds.some(item => item.isTimeToTake && !item.taken);
              // Determine if all medications at this time are taken
              const allTaken = meds.every(item => item.taken);
              
              // Use clear color scheme:
              // Green for taken medication
              // Red for upcoming medication
              // Gray for future medications
              const dotColor = allTaken ? '#4CAF50' : // Green for taken
                             anyTimeToTake ? '#FF0000' : // Red for upcoming
                             '#4187f8'; // Gray for future
              
              // Calculate label position to ensure it stays on screen
              const labelPosition = calculateLabelPosition(x, y, radius);
              
              // Check if this dot is selected
              const isSelected = selectedTimeKey === timeKey;
              
              // Determine if this medication is very near in time (within 30 minutes)
              const nowTime = new Date(currentTime);
              const medTime = new Date();
              medTime.setHours(hours, minutes, 0, 0);
              
              const timeDiffMinutes = Math.abs(
                (medTime.getHours() * 60 + medTime.getMinutes()) - 
                (nowTime.getHours() * 60 + nowTime.getMinutes())
              );
              
              const isVeryNearInTime = timeDiffMinutes <= 30 && !allTaken;

              return (
                <TouchableOpacity
                  key={`time-${timeKey}`}
                  style={[
                    styles.medicationDot,
                    { 
                      transform: [
                        { translateX: x },
                        { translateY: y }
                      ],
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      justifyContent: 'center',
                      alignItems: 'center',
                      zIndex: 50
                    }
                  ]}
                  onPress={() => {
                    const newSelection = isSelected ? null : timeKey;
                    setSelectedTimeKey(newSelection);
                    setForceUpdate(prev => prev + 1);
                  }}
                  activeOpacity={0.5}
                  hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
                >
                  <View 
                    style={[
                      styles.dotInner,
                      { 
                        backgroundColor: dotColor,
                        width: anyTimeToTake && !allTaken || isSelected ? 18 : 12,
                        height: anyTimeToTake && !allTaken || isSelected ? 18 : 12,
                        borderRadius: anyTimeToTake && !allTaken || isSelected ? 9 : 6,
                        borderWidth: isSelected ? 3 : anyTimeToTake && !allTaken ? 2 : 0.5,
                        borderColor: isSelected ? '#FFFFFF' : anyTimeToTake && !allTaken ? 'white' : 'rgba(255, 255, 255, 0.8)',
                        shadowColor: isSelected ? "#FFFFFF" : anyTimeToTake ? "#FF0000" : "transparent",
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: isSelected ? 0.8 : anyTimeToTake ? 0.6 : 0,
                        shadowRadius: isSelected ? 5 : anyTimeToTake ? 3 : 0,
                        elevation: isSelected ? 5 : anyTimeToTake ? 3 : 0,
                      }
                    ]} 
                  />
                  {isVeryNearInTime && (
                    <Animated.View 
                      style={[
                        styles.pulsingOverlay,
                        { 
                          backgroundColor: 'rgba(255, 0, 0, 0.3)',
                          transform: [{ scale: pulseAnim }],
                          borderWidth: 0.5,
                          borderColor: 'rgba(255, 0, 0, 0.8)',
                        }
                      ]}
                    />
                  )}
                  
                  {/* Medication name labels - only show when this dot is selected */}
                  {isSelected && (
                    <MedicationLabels
                      meds={meds}
                      position={labelPosition}
                      takeAction={(medication, time) => {
                        // Implementation of takeAction function
                      }}
                    />
                  )}
                </TouchableOpacity>
              );
            });
          })()}
          
          {/* Clock hands container */}
          <View style={styles.handsContainer}>
            {/* Hour hand */}
            <View 
              style={[
                styles.hourHand,
                { transform: [{ rotate: `${handAngles.hour}deg` }] }
              ]}
            />
            
            {/* Minute hand */}
            <View 
              style={[
                styles.minuteHand,
                { transform: [{ rotate: `${handAngles.minute}deg` }] }
              ]}
            />
            
            {/* Center dot */}
            <View style={styles.centerDot} />
          </View>
        </View>
      </View>
    </View>
  );
}

// Add a component specifically for medication names to fix render issues
function MedicationLabels({ 
  meds, 
  position, 
  takeAction 
}: { 
  meds: Array<{med: Medication, taken: boolean, isTimeToTake: boolean}>,
  position: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    flexDirection?: "column" | "column-reverse";
    alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
  },
  takeAction: (medication: Medication, time: string) => void
}) {
  return (
    <View 
      style={{
        position: 'absolute',
        top: position.top,
        bottom: position.bottom,
        left: position.left,
        right: position.right,
        flexDirection: position.flexDirection || 'column',
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 8,
        borderRadius: 6,
        zIndex: 9999,
        elevation: 10,
        minWidth: 100,
        minHeight: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
      }}
    >
      {meds.map((item, index) => (
        <Text 
          key={`med-${item.med.id}-${index}`}
          style={{
            fontSize: 12,
            paddingHorizontal: 6,
            paddingVertical: 3,
            borderRadius: 3,
            minWidth: 90,
            color: 'white',
            fontWeight: item.isTimeToTake && !item.taken ? '700' : '500',
            backgroundColor: item.taken ? 'rgba(76,175,80,0.7)' : 'rgba(50,50,50,0.7)',
            marginTop: 2,
            marginBottom: 2
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.med.name}
        </Text>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todaysMedications, setTodaysMedications] = useState<Medication[]>([]);
  const [completedDoses, setCompletedDoses] = useState(0);
  const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);
  const [scannedMedications, setScannedMedications] = useState<Medication[]>([]);

  // Add helper function to format time from 24-hour to 12-hour format
  const formatTo12Hour = (time24: string): string => {
    // Parse hours and minutes from 24-hour time format (HH:MM)
    const [hours24, minutes] = time24.split(':').map(Number);
    
    // Convert to 12-hour format
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12; // 0 should be displayed as 12
    
    // Format as HH:MM AM/PM
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const loadMedications = useCallback(async () => {
    try {
      // Sync shared medications if the user is logged in
      if (user) {
        await syncSharedMedications(user.uid);
      }
      
      const [allMedications, todaysDoses] = await Promise.all([
        getMedications(),
        getTodaysDoses(),
      ]);

      setDoseHistory(todaysDoses);
      setMedications(allMedications);

      // Filter medications for today
      const today = new Date();
      const todayMeds = allMedications.filter((med) => {
        const startDate = new Date(med.startDate);
        const durationDays = parseInt(med.duration.split(" ")[0]);

        // For ongoing medications or if within duration
        if (
          durationDays === -1 ||
          (today >= startDate &&
            today <=
              new Date(
                startDate.getTime() + durationDays * 24 * 60 * 60 * 1000
              ))
        ) {
          return true;
        }
        return false;
      });

      setTodaysMedications(todayMeds);

      // Calculate completed doses
      const completed = todaysDoses.filter((dose) => dose.taken).length;
      setCompletedDoses(completed);
    } catch (error) {
      console.error("Error loading medications:", error);
    }
  }, [user]);

  const loadScannedMedications = useCallback(async () => {
    try {
      console.log("Loading all medications to find scanned ones");
      const allMedications = await getMedications();
      console.log(`Found ${allMedications.length} total medications`);
      
      // For debugging, log all medications safely
      allMedications.forEach((med, i) => {
        // Check if times exists before calling join to avoid errors
        const timesStr = med.times && Array.isArray(med.times) ? med.times.join(', ') : 'undefined';
        console.log(`Medication ${i+1}: ${med.name || 'unnamed'}, times: ${timesStr}`);
      });
      
      // Filter out any medications without proper times array
      const validMedications = allMedications.filter(med => 
        med && med.times && Array.isArray(med.times) && med.times.length > 0
      );
      
      console.log(`Found ${validMedications.length} valid medications with times`);
      
      setScannedMedications(validMedications);
    } catch (error) {
      console.error("Error loading scanned medications:", error);
    }
  }, []);

  const setupNotifications = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        console.log("Failed to get push notification token");
        return;
      }

      // Schedule reminders for all medications
      const medications = await getMedications();
      for (const medication of medications) {
        if (medication.reminderEnabled) {
          await scheduleMedicationReminder(medication);
        }
      }
    } catch (error) {
      console.error("Error setting up notifications:", error);
    }
  };

  // Use useEffect for initial load
  useEffect(() => {
    loadMedications();
    loadScannedMedications();
    setupNotifications();

    // Handle app state changes for notifications
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        loadMedications();
        loadScannedMedications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Use useFocusEffect for subsequent updates
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = () => {
        // Cleanup if needed
      };

      loadMedications();
      loadScannedMedications();
      return () => unsubscribe();
    }, [loadMedications, loadScannedMedications])
  );

  const handleTakeDose = async (medication: Medication, time: string) => {
    try {
      // Create a Date with the current date but with the specified time
      const now = new Date();
      const doseTime = new Date();
      doseTime.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]), 0, 0);
      
      await recordDose(medication.id, true, doseTime.toISOString());
      await loadMedications(); // Reload data after recording dose
    } catch (error) {
      console.error("Error recording dose:", error);
      Alert.alert("Error", "Failed to record dose. Please try again.");
    }
  };

  const isDoseTaken = (medicationId: string) => {
    return doseHistory.some(
      (dose) => dose.medicationId === medicationId && dose.taken
    );
  };

  const progress =
    todaysMedications.length > 0
      ? completedDoses / (todaysMedications.length * 2)
      : 0;

  // Add a function to handle medication deletion
  const handleDeleteMedication = async (medicationId: string) => {
    try {
      Alert.alert(
        "Delete Medication",
        "Are you sure you want to delete this medication and all its reminders?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              // Cancel existing reminders
              await cancelMedicationReminders(medicationId);
              // Delete the medication
              await deleteMedication(medicationId);
              // Refresh medication lists
              loadMedications();
              loadScannedMedications();
              Alert.alert("Success", "Medication deleted successfully");
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error deleting medication:", error);
      Alert.alert("Error", "Failed to delete medication. Please try again.");
    }
  };

  // Add a function to handle medication editing
  const handleEditMedication = (id: string) => {
    router.push({
      pathname: "/medications/edit",
      params: { medicationId: id }
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={["#1976D2", "#0D47A1"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.flex1}>
              <Text style={styles.greeting}>Daily Schedule</Text>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => router.push(ROUTES.PROFILE)}
            >
              <Ionicons name="person-circle-outline" size={26} color="white" />
            </TouchableOpacity>
          </View>
          <MedicationClock
            medications={todaysMedications}
            doseHistory={doseHistory}
            progress={progress}
            totalDoses={todaysMedications.length * 2}
            completedDoses={completedDoses}
          />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <Link href={action.route} key={action.label} asChild>
                <TouchableOpacity style={styles.actionButton}>
                  <LinearGradient
                    colors={action.gradient}
                    style={styles.actionGradient}
                  >
                    <View style={styles.actionContent}>
                      <View style={styles.actionIcon}>
                        <Ionicons name={action.icon} size={28} color="white" />
                      </View>
                      <Text style={styles.actionLabel}>{action.label}</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Link>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Scanned Medications</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={() => {
                  loadScannedMedications();
                  Alert.alert('Refreshed', 'Medication list has been refreshed');
                }}
              >
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/scan')}>
                <Text style={styles.seeAllButton}>Scan New</Text>
              </TouchableOpacity>
            </View>
          </View>
          {scannedMedications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="camera-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>
                No scanned medications yet
              </Text>
              <TouchableOpacity 
                style={styles.addMedicationButton}
                onPress={() => router.push('/scan')}
              >
                <Text style={styles.addMedicationButtonText}>Scan Prescription</Text>
              </TouchableOpacity>
            </View>
          ) : (
            scannedMedications.flatMap((medication) => 
              medication.times.map((time, index) => {
                const doseId = `scanned-${medication.id}-${time}-${index}`;
                const taken = doseHistory.some(
                  (dose) => dose.medicationId === medication.id && 
                          new Date(dose.timestamp).getHours() === parseInt(time.split(':')[0]) &&
                          new Date(dose.timestamp).getMinutes() === parseInt(time.split(':')[1])
                );
                
                return (
                  <View key={doseId} style={styles.doseCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.leftSection}>
                        <View
                          style={[
                            styles.doseBadge,
                            { backgroundColor: `${medication.color}15` },
                          ]}
                        >
                          <Ionicons
                            name="scan-outline"
                            size={24}
                            color={medication.color}
                          />
                        </View>
                        <View style={styles.medicationDetails}>
                          <Text style={styles.medicineName}>{medication.name}</Text>
                          <Text style={styles.dosageInfo}>{medication.dosage}</Text>
                          <Text style={styles.durationInfo}>Duration: {medication.duration}</Text>
                        </View>
                      </View>
                      <View style={styles.rightSection}>
                        <View style={styles.doseTime}>
                          <Ionicons name="time-outline" size={16} color="#666" />
                          <Text style={styles.timeText}>{formatTo12Hour(time)}</Text>
                        </View>
                        <View style={styles.actionRow}>
                          {taken ? (
                            <View style={[styles.takenBadge]}>
                              <Ionicons
                                name="checkmark-circle"
                                size={20}
                                color="#4CAF50"
                              />
                              <Text style={styles.takenText}>Taken</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[
                                styles.takeDoseButton,
                                { backgroundColor: medication.color },
                              ]}
                              onPress={() => handleTakeDose(medication, time)}
                            >
                              <Text style={styles.takeDoseText}>Take</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={styles.footerActionButton}
                        onPress={() => handleEditMedication(medication.id)}
                      >
                        <Ionicons name="create-outline" size={20} color="#555" />
                        <Text style={styles.footerActionText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.footerActionButton}
                        onPress={() => handleDeleteMedication(medication.id)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#f44336" />
                        <Text style={styles.footerActionText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <Link href="/calendar" asChild>
              <TouchableOpacity>
                <Text style={styles.seeAllButton}>See All</Text>
              </TouchableOpacity>
            </Link>
          </View>
          {todaysMedications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>
                No medications scheduled for today
              </Text>
              <Link href="/medications/add" asChild>
                <TouchableOpacity style={styles.addMedicationButton}>
                  <Text style={styles.addMedicationButtonText}>
                    Add Medication
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          ) : (
            todaysMedications.flatMap((medication) => 
              medication.times.map((time, index) => {
                const doseId = `regular-${medication.id}-${time}-${index}`;
                const taken = doseHistory.some(
                  (dose) => dose.medicationId === medication.id && 
                          new Date(dose.timestamp).getHours() === parseInt(time.split(':')[0]) &&
                          new Date(dose.timestamp).getMinutes() === parseInt(time.split(':')[1])
                );
                
                return (
                  <View key={doseId} style={styles.doseCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.leftSection}>
                        <View
                          style={[
                            styles.doseBadge,
                            { backgroundColor: `${medication.color}15` },
                          ]}
                        >
                          <Ionicons
                            name="medical"
                            size={24}
                            color={medication.color}
                          />
                        </View>
                        <View style={styles.medicationDetails}>
                          <Text style={styles.medicineName}>{medication.name}</Text>
                          <Text style={styles.dosageInfo}>{medication.dosage}</Text>
                        </View>
                      </View>
                      <View style={styles.rightSection}>
                        <View style={styles.doseTime}>
                          <Ionicons name="time-outline" size={16} color="#666" />
                          <Text style={styles.timeText}>{formatTo12Hour(time)}</Text>
                        </View>
                        <View style={styles.actionRow}>
                          {taken ? (
                            <View style={[styles.takenBadge]}>
                              <Ionicons
                                name="checkmark-circle"
                                size={20}
                                color="#4CAF50"
                              />
                              <Text style={styles.takenText}>Taken</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[
                                styles.takeDoseButton,
                                { backgroundColor: medication.color },
                              ]}
                              onPress={() => handleTakeDose(medication, time)}
                            >
                              <Text style={styles.takeDoseText}>Take</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={styles.footerActionButton}
                        onPress={() => handleEditMedication(medication.id)}
                      >
                        <Ionicons name="create-outline" size={20} color="#555" />
                        <Text style={styles.footerActionText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.footerActionButton}
                        onPress={() => handleDeleteMedication(medication.id)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#f44336" />
                        <Text style={styles.footerActionText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )
          )}
        </View>
      </View>

      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity
                onPress={() => setShowNotifications(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {todaysMedications.flatMap((medication) => (
              medication.times.map((time, index) => (
                <View key={`${medication.id}-${time}`} style={styles.notificationItem}>
                  <View style={styles.notificationIcon}>
                    <Ionicons name="medical" size={24} color={medication.color} />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>
                      {medication.name}
                    </Text>
                    <Text style={styles.notificationMessage}>
                      {medication.dosage}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatTo12Hour(time)}
                    </Text>
                  </View>
                </View>
              ))
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 15,
  },
  actionButton: {
    width: (width - 52) / 2,
    height: 110,
    borderRadius: 16,
    overflow: "hidden",
  },
  actionGradient: {
    flex: 1,
    padding: 15,
  },
  actionContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginTop: 8,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 5,
  },
  seeAllButton: {
    color: "#1976D2",
    fontWeight: "600",
  },
  doseCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rightSection: {
    alignItems: "flex-end",
  },
  doseBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  medicationDetails: {
    flex: 1,
    justifyContent: "center",
  },
  medicineName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  dosageInfo: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  durationInfo: {
    fontSize: 13,
    color: "#666",
    fontStyle: "italic",
  },
  doseTime: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  timeText: {
    marginLeft: 5,
    color: "#666",
    fontSize: 13,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  takeDoseButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  takeDoseText: {
    color: "white",
    fontWeight: "600",
    fontSize: 13,
  },
  takenBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  takenText: {
    color: "#4CAF50",
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 4,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginTop: 12,
    paddingTop: 8,
  },
  footerActionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
    paddingVertical: 4,
  },
  footerActionText: {
    fontSize: 12,
    marginLeft: 4,
    color: "#555",
    fontWeight: "500",
  },
  progressContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  progressTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  progressPercentage: {
    fontSize: 36,
    fontWeight: "bold",
    color: "white",
  },
  progressLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 4,
  },
  progressRing: {
    transform: [{ rotate: "-90deg" }],
  },
  flex1: {
    flex: 1,
  },
  notificationButton: {
    position: "relative",
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    marginLeft: 8,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF5252",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0D47A1",
    paddingHorizontal: 4,
  },
  notificationCount: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
  },
  progressDetails: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  notificationItem: {
    flexDirection: "row",
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    marginBottom: 10,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: "#999",
  },
  emptyState: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "white",
    borderRadius: 16,
    marginTop: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
    marginBottom: 20,
  },
  addMedicationButton: {
    backgroundColor: "#1976D2",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addMedicationButtonText: {
    color: "white",
    fontWeight: "600",
  },
  refreshButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  refreshButtonText: {
    color: '#1976D2',
    fontSize: 12,
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  testVoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D2',
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 5,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  testVoiceButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9C27B0',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 15,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  // Clock-related styles
  timeClockContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  clockOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  clockInner: {
    width: '100%',
    height: '100%',
    borderRadius: 95,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  clockCenter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  hourNumber: {
    position: 'absolute',
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    width: 20,
    height: 20,
    textAlignVertical: 'center',
    zIndex: 2,
  },
  hourMarker: {
    position: 'absolute',
    width: 6,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    top: '50%',
    right: 15,
    transform: [{ translateY: -1 }],
  },
  medicationDot: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  dotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  pulsingOverlay: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    opacity: 0.7,
    zIndex: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 0, 0, 0.8)',
  },
  handsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
  },
  hourHand: {
    position: 'absolute',
    width: 50,
    height: 5,
    backgroundColor: 'white',
    borderRadius: 5,
    top: '50%',
    left: '50%',
    marginTop: -2.5,
    transformOrigin: 'left',
    zIndex: 3,
  },
  minuteHand: {
    position: 'absolute',
    width: 70,
    height: 3,
    backgroundColor: '#64B5F6',
    borderRadius: 3,
    top: '50%',
    left: '50%',
    marginTop: -1.5,
    transformOrigin: 'left',
    zIndex: 4,
  },
  centerDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
    zIndex: 6,
  },
  currentTimeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  progressText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  debugTimeText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 3,
  },
  medicationLabelsContainer: {
    position: 'absolute',
    zIndex: 100,
    flexDirection: 'column',
    alignItems: 'flex-start',
    maxWidth: 150,
    gap: 3,
  },
  medicationLabel: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    width: 'auto',
    minWidth: 90,
    overflow: 'hidden',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
    marginBottom: 1,
  },
});
