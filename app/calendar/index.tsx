import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  FlatList,
  Image,
  Dimensions,
  PanResponder,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  getMedications,
  getDoseHistory,
  recordDose,
  deleteMedication,
  Medication,
  DoseHistory,
} from "../../utils/storage";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import pill images
const PillImages = {
  bluePill: require('../../assets/purple pill.png'),
  purplePill: require('../../assets/pill with blue bead.png'),
  blueBead: require('../../assets/blue pill with bead.png'),
  injection: require('../../assets/injection.png'),
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", 
  "May", "June", "July", "August",
  "September", "October", "November", "December"
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CalendarScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);
  const calendarRef = useRef<FlatList>(null);
  
  // State for medication detail modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<any>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [isMedicationTaken, setIsMedicationTaken] = useState(false);

  // Create pan responder for month swiping
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderEnd: (e, gestureState) => {
        // Swipe left (next month)
        if (gestureState.dx < -50) {
          handleMonthChange(1);
        }
        // Swipe right (previous month)
        else if (gestureState.dx > 50) {
          handleMonthChange(-1);
        }
      },
    })
  ).current;

  const loadData = useCallback(async () => {
    try {
      const [meds, history] = await Promise.all([
        getMedications(),
        getDoseHistory(),
      ]);
      setMedications(meds);
      setDoseHistory(history);
    } catch (error) {
      console.error("Error loading calendar data:", error);
    }
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Go back to home page
  const goToHome = () => {
    router.back();
  };

  // Handle medication edit
  const handleEditMedication = (medication: Medication) => {
    // Navigate to edit medication screen with the medication data
    router.push({
      pathname: "/medications/edit",
      params: { 
        id: medication.id
      }
    } as any);
  };

  // Handle medication delete with confirmation
  const handleDeleteMedication = async (medicationId: string) => {
    try {
      Alert.alert(
        "Delete Medication",
        "Are you sure you want to delete this medication?",
        [
          { 
            text: "Cancel", 
            style: "cancel" 
          },
          { 
            text: "Delete", 
            style: "destructive",
            onPress: async () => {
              try {
                // Use the deleteMedication function from storage utils
                await deleteMedication(medicationId);
                // Refresh the medications list
                await loadData();
              } catch (error) {
                console.error("Error deleting medication:", error);
                Alert.alert("Error", "Could not delete medication. Please try again.");
              }
            } 
          }
        ]
      );
    } catch (error) {
      console.error("Error showing delete confirmation:", error);
    }
  };

  // Handle marking medication as taken directly from card
  const handleTakeMedication = async (medication: Medication, time: string) => {
    const doseTime = new Date(selectedDate);
    doseTime.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]), 0, 0);
    
    await recordDose(medication.id, true, doseTime.toISOString());
    await loadData();
  };

  // Handle opening the medication detail modal
  const openMedicationDetail = (medication: any, time: string, taken: boolean) => {
    setSelectedMedication(medication);
    setSelectedTime(time);
    setIsMedicationTaken(taken);
    setDetailModalVisible(true);
  };

  // Handle marking medication as taken
  const handleMarkAsTaken = async () => {
    if (!selectedMedication || !selectedTime) return;
    
    const doseTime = new Date(selectedDate);
    doseTime.setHours(parseInt(selectedTime.split(':')[0]), parseInt(selectedTime.split(':')[1]), 0, 0);
    
    await recordDose(selectedMedication.id, true, doseTime.toISOString());
    setIsMedicationTaken(true);
    await loadData();
  };

  // Handle month change
  const handleMonthChange = (change: number) => {
    let newMonth = currentMonth + change;
    let newYear = currentYear;
    
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    
    // Set selected date to first day of new month
    const newDate = new Date(newYear, newMonth, 1);
    
    // If selected date was within the valid range of the month, try to keep the same day
    const currentDay = selectedDate.getDate();
    const lastDayOfNewMonth = new Date(newYear, newMonth + 1, 0).getDate();
    
    if (currentDay <= lastDayOfNewMonth) {
      newDate.setDate(currentDay);
    }
    
    setSelectedDate(newDate);
    
    // Scroll calendar to the first of the month
    if (calendarRef.current) {
      calendarRef.current.scrollToIndex({
        index: 0,
        animated: true
      });
    }
    
    console.log(`Changed to month: ${MONTHS[newMonth]} ${newYear}`);
  };

  // Get all dates for the current month
  const getMonthDates = () => {
    const dates = [];
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const numDays = lastDay.getDate();
    
    // Add days for current month
    for (let i = 1; i <= numDays; i++) {
      const date = new Date(currentYear, currentMonth, i);
      dates.push(date);
    }
    
    return dates;
  };

  const monthDates = getMonthDates();

  // Calculate initial index to scroll to current date
  const getInitialScrollIndex = () => {
    const today = new Date();
    if (today.getMonth() === currentMonth && today.getFullYear() === currentYear) {
      return today.getDate() - 1;
    }
    return 0;
  };

  const renderCalendar = () => {
    const today = new Date().toDateString();
    
    return (
      <View style={{ height: 160 }}>
        <FlatList
          ref={calendarRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          data={monthDates}
          initialScrollIndex={getInitialScrollIndex()}
          getItemLayout={(data, index) => ({
            length: 55, // width of each day item
            offset: 55 * index,
            index,
          })}
          keyExtractor={(item) => item.toISOString()}
          renderItem={({ item }) => {
            const isToday = item.toDateString() === today;
            const isSelected = item.toDateString() === selectedDate.toDateString();
            const dayNumber = item.getDate();
            const dayName = WEEKDAYS[item.getDay()];
            const hasDoses = doseHistory.some(
              (dose) => new Date(dose.timestamp).toDateString() === item.toDateString()
            );

            return (
              <TouchableOpacity
                style={[
                  styles.weekDay,
                  isSelected && styles.selectedDay,
                  isToday && styles.today
                ]}
                onPress={() => setSelectedDate(item)}
              >
                <Text style={[
                  styles.weekDayNumber,
                  (isSelected || isToday) && styles.selectedDayText
                ]}>
                  {dayNumber}
                </Text>
                <Text style={[
                  styles.weekDayText,
                  (isSelected || isToday) && styles.selectedDayText
                ]}>
                  {dayName}
                </Text>
                {hasDoses && <View style={styles.eventDot} />}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.weekCalendarContainer}
        />
      </View>
    );
  };

  const formatTime12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'pm' : 'am';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Helper function to truncate medication name to first 3 words
  const truncateMedicationName = (name: string): string => {
    if (!name) return "";
    const words = name.split(' ');
    return words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '');
  };

  // Helper function to select a pill image based on medication name/color
  const getPillImage = (medication: Medication, index: number = 0) => {
    // Select image based on index to ensure different images for different cards
    // This will cycle through the available images
    const imageKeys = Object.keys(PillImages) as Array<keyof typeof PillImages>;
    const selectedKey = imageKeys[index % imageKeys.length];
    return PillImages[selectedKey];
  };

  // Helper to determine medication frequency based on times array
  const getMedicationFrequency = (medication: Medication): string => {
    if (!medication.times || !Array.isArray(medication.times)) return "";
    
    const count = medication.times.length;
    if (count === 1) return "Once daily";
    if (count === 2) return "Twice daily";
    if (count === 3) return "Three times daily";
    if (count === 4) return "Four times daily";
    return `${count} times daily`;
  };

  // Format date as "DD MMM YYYY"
  const formatDate = (date: Date): string => {
    const day = date.getDate();
    const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Helper to get duration text
  const getDurationText = (medication: Medication): string => {
    if (!medication.duration) return "";
    if (medication.duration.toLowerCase() === "ongoing") return "Ongoing";
    
    const daysMatch = medication.duration.match(/(\d+)/);
    if (daysMatch && daysMatch[1]) {
      const days = parseInt(daysMatch[1]);
      return `${days} days`;
    }
    return medication.duration;
  };

  // Helper to get medication description (placeholder for now)
  const getMedicationDescription = (medication: Medication): string => {
    const name = medication.name.toLowerCase();
    
    if (name.includes('fludac') || name.includes('prozac') || name.includes('fluoxetine')) {
      return 'Antidepressant\nSelective serotonin reuptake inhibitor (SSRI) group of medicines widely prescribed to treat depression and other mental health conditions like panic disorder...';
    } else if (name.includes('tylenol') || name.includes('acetaminophen') || name.includes('paracetamol')) {
      return 'Pain reliever and fever reducer\nCommonly used to treat mild to moderate pain and reduce fever. Works by blocking pain signals in the brain...';
    } else if (name.includes('zoloft') || name.includes('sertraline')) {
      return 'Antidepressant\nSelective serotonin reuptake inhibitor (SSRI) used to treat depression, anxiety, and other mental health conditions...';
    } else {
      return 'Medication\nPrescribed by your doctor to treat your condition. Take as directed and consult with your healthcare provider about potential side effects...';
    }
  };

  const renderMedicationsForDate = () => {
    const dateStr = selectedDate.toDateString();
    const dayDoses = doseHistory.filter(
      (dose) => new Date(dose.timestamp).toDateString() === dateStr
    );

    // Check if medications is undefined or empty before trying to map
    if (!medications || medications.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="medical-outline" size={48} color="#fff" />
          <Text style={styles.emptyStateText}>
            No medications found for this date
          </Text>
        </View>
      );
    }

    // Filter medications to only include those active on the selected date
    const activeMedications = medications.filter(medication => {
      if (!medication) return false;
      
      // Get the start date from medication
      const startDate = new Date(medication.startDate);
      
      // Get duration in days (handle "ongoing" case with -1)
      let durationDays = -1;
      if (medication.duration) {
        if (medication.duration.toLowerCase() === 'ongoing') {
          durationDays = -1; // Ongoing treatment
        } else {
          // Try to extract number of days
          const daysMatch = medication.duration.match(/(\d+)/);
          if (daysMatch && daysMatch[1]) {
            durationDays = parseInt(daysMatch[1]);
          }
        }
      }
      
      // Calculate end date (if not ongoing)
      let endDate = null;
      if (durationDays !== -1) {
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + durationDays);
      }
      
      // Check if selected date is within the active range
      return (
        selectedDate >= startDate && 
        (durationDays === -1 || selectedDate <= (endDate ?? new Date(9999, 11, 31)))
      );
    });
    
    // If no active medications for this date, show empty state
    if (activeMedications.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color="#fff" />
          <Text style={styles.emptyStateText}>
            No active medications for this date
          </Text>
        </View>
      );
    }

    // Flatten to show each medication time as a separate item
    return activeMedications.flatMap((medication, medIndex) => {
      // Check if medication times exists and is an array
      if (!medication || !medication.times || !Array.isArray(medication.times)) {
        console.log(`Medication ${medication?.name} has invalid times:`, medication?.times);
        return []; // Skip this medication
      }
      
      return medication.times.map((time, timeIndex) => {
        const doseId = `${medication.id}-${time}`;
        
        // Check if this specific time slot has been taken
        const taken = dayDoses.some(
          (dose) => dose.medicationId === medication.id && 
                    new Date(dose.timestamp).getHours() === parseInt(time.split(':')[0]) &&
                    new Date(dose.timestamp).getMinutes() === parseInt(time.split(':')[1])
        );

        // Get appropriate pill image - use the index to select different images
        const uniqueIndex = medIndex * 10 + timeIndex; // Ensure a unique index for each medication/time combination
        const pillImage = getPillImage(medication, uniqueIndex);
        const frequency = getMedicationFrequency(medication);
        const startDate = new Date(medication.startDate);
        const formattedDate = formatDate(startDate);
        const duration = getDurationText(medication);
        const truncatedName = truncateMedicationName(medication.name);

        return (
          <TouchableOpacity 
            key={doseId} 
            style={styles.medicationCard}
            onPress={() => openMedicationDetail(medication, time, taken)}
          >
            <LinearGradient
              colors={["#7B68EE", "#5D3FD3"]}
              style={[styles.cardGradient, {borderRadius: 20}]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />

            <View style={styles.medicationHeader}>
              <View style={styles.medicationTitleContainer}>
                <Ionicons name="medical-outline" size={24} color="white" style={styles.infoIcon} />
                <Text style={styles.medicationName} numberOfLines={1}>
                  {truncatedName}
              </Text>
              </View>
              
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={22} color="white" style={styles.infoIcon} />
                <Text style={styles.medicationTime}>{formatTime12Hour(time)}</Text>
                </View>
            </View>
            
            <View style={styles.medicationRow}>
              <Ionicons name="repeat-outline" size={20} color="white" style={styles.infoIcon} />
              <Text style={styles.infoText}>{frequency}</Text>
            </View>
            
            <View style={styles.medicationRow}>
              <Ionicons name="flask-outline" size={20} color="white" style={styles.infoIcon} />
              <Text style={styles.infoText}>{medication.dosage}</Text>
              </View>
            
            <View style={styles.medicationRow}>
              <Ionicons name="hourglass-outline" size={20} color="white" style={styles.infoIcon} />
              <Text style={styles.infoText}>{duration}</Text>
            </View>

            {taken ? (
              <View style={styles.takenButton}>
                <Ionicons name="checkmark" size={16} color="white" />
                <Text style={styles.takenText}>Taken</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.notTakenButton}
                onPress={() => handleTakeMedication(medication, time)}
              >
                <Text style={styles.notTakenText}>Take</Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.cardFooter}>
              <TouchableOpacity style={styles.footerButton}>
                <Ionicons name="notifications-outline" size={22} color="white" />
                <Text style={styles.footerButtonText}>Reminder</Text>
              </TouchableOpacity>
              
              <View style={styles.buttonDivider} />
              
              <TouchableOpacity 
                style={styles.footerButton}
                onPress={() => handleEditMedication(medication)}
              >
                <Ionicons name="create-outline" size={22} color="white" />
                <Text style={styles.footerButtonText}>Edit</Text>
              </TouchableOpacity>
              
              <View style={styles.buttonDivider} />
              
              <TouchableOpacity 
                style={styles.footerButton}
                onPress={() => handleDeleteMedication(medication.id)}
              >
                <Ionicons name="trash-outline" size={22} color="white" />
                <Text style={styles.footerButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
              </TouchableOpacity>
        );
      });
    });
  };

  const renderMedicationDetailModal = () => {
    if (!selectedMedication) return null;
    
    // Generate a consistent index based on medication ID
    const medicationIndex = selectedMedication.id.charCodeAt(0) % 4; // Use the first character of ID to determine image
    const pillImage = getPillImage(selectedMedication, medicationIndex);
    const description = getMedicationDescription(selectedMedication);

  return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
      <LinearGradient
            colors={["#7B68EE", "#5D3FD3"]}
            style={styles.modalBackground}
        start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
      />

          <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalBackButton}
              onPress={() => setDetailModalVisible(false)}
            >
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            
            <Text style={styles.modalHeaderText}>NEXT DOSE</Text>
            
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.pillImageContainer}>
            <Image 
              source={pillImage}
              style={styles.detailPillImage}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.detailCard}>
            <Text style={styles.detailMedicationName}>{selectedMedication.name}</Text>
            <Text style={styles.detailMedicationTime}>
              {formatTime12Hour(selectedTime)} · {selectedMedication.dosage}
            </Text>
            
            <Text style={styles.medicationCategory}>
              {description.split('\n')[0]}
            </Text>
            
            <Text style={styles.medicationDescription}>
              {description.split('\n')[1]}
            </Text>
            
            <TouchableOpacity style={styles.moreButton}>
              <Text style={styles.moreButtonText}>More</Text>
            </TouchableOpacity>
          </View>

          {!isMedicationTaken && (
            <TouchableOpacity 
              style={styles.markAsTakenButton}
              onPress={handleMarkAsTaken}
            >
              <Ionicons name="checkmark" size={32} color="white" />
            </TouchableOpacity>
          )}
          
          {isMedicationTaken && (
            <View style={styles.alreadyTakenContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.alreadyTakenText}>
                Marked as taken
              </Text>
          </View>
          )}
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#7B68EE", "#5D3FD3"]}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <View style={styles.content}>
        {/* Header with back button and month navigation */}
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={goToHome}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View 
            style={styles.monthNavContainer}
            {...panResponder.panHandlers}
          >
            <TouchableOpacity 
              style={styles.monthNavButton}
              onPress={() => handleMonthChange(-1)}
            >
              <Ionicons name="chevron-back" size={20} color="white" />
            </TouchableOpacity>
            
            <Text style={styles.monthText}>
              {MONTHS[currentMonth].toUpperCase()} {currentYear}
            </Text>
            
            <TouchableOpacity 
              style={styles.monthNavButton}
              onPress={() => handleMonthChange(1)}
            >
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {renderCalendar()}

        <ScrollView 
          style={styles.medicationsContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.medicationsContentContainer}
        >
          {renderMedicationsForDate()}
        </ScrollView>
      </View>
      
      {renderMedicationDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  headerContainer: {
    paddingHorizontal: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 10,
  },
  monthNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  monthNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    letterSpacing: 1,
    marginHorizontal: 5,
  },
  weekCalendarContainer: {
    paddingHorizontal: 15,
    paddingBottom: 0,
  },
  weekDay: {
    width: 50,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 5,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedDay: {
    
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  today: {
    backgroundColor: "white",
  },
  weekDayNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  weekDayText: {
    fontSize: 12,
    color: "white",
  },
  selectedDayText: {
    color: "#5D3FD3",
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    // backgroundColor: "#FF5252",
    marginTop: 4,
  },
  medicationsContainer: {
    flex: 1,
    marginTop: -20,
    paddingHorizontal: 15,
  },
  medicationsContentContainer: {
    paddingBottom: 20,
    paddingTop: 0,
  },
  medicationCard: {
    borderRadius: 20,
    marginBottom: 16,
    padding: 16,
    position: "relative",
    minHeight: 100,
    overflow: 'hidden',
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
  },
  medicationTime: {
    fontSize: 16,
    color: "white",
    fontWeight: "500",
  },
  medicationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  infoText: {
    color: "white",
    fontSize: 16,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  takenButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginLeft: 'auto',
    alignSelf: 'flex-start',
    marginTop: -30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  takenText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 5,
    fontSize: 16,
  },
  notTakenButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginLeft: 'auto',
    alignSelf: 'flex-start',
    marginTop: -30,
  },
  notTakenText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 8,
    paddingTop: 6,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    flex: 1,
    justifyContent: 'center',
  },
  footerButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 5,
  },
  buttonDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 10,
  },
  modalBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
    letterSpacing: 1,
  },
  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  pillImageContainer: {
    width: 120,
    height: 60,
    marginVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailPillImage: {
    width: 140,
    height: 180,
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: 25,
    width: '90%',
    padding: 25,
    marginVertical: 10,
  },
  detailMedicationName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  detailMedicationTime: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  medicationCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  medicationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  moreButton: {
    alignSelf: 'flex-start',
  },
  moreButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  markAsTakenButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  alreadyTakenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  alreadyTakenText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  medicationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: 'rgba(255, 255, 255, 0.2)',
    // paddingHorizontal: 10,
    // paddingVertical: 4,
    borderRadius: 12,
  },
  emptyState: {
    padding: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateText: {
    color: "white",
    fontSize: 16,
    marginTop: 20,
    textAlign: "center",
  },
});
