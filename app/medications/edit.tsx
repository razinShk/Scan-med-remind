import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { 
  getMedications, 
  updateMedication, 
  Medication
} from "../../utils/storage";
import {
  updateMedicationReminders,
} from "../../utils/notifications";

const { width } = Dimensions.get("window");

const FREQUENCIES = [
  {
    id: "1",
    label: "Once daily",
    icon: "sunny-outline" as const,
    times: ["09:00"],
  },
  {
    id: "2",
    label: "Twice daily",
    icon: "sync-outline" as const,
    times: ["09:00", "21:00"],
  },
  {
    id: "3",
    label: "Three times daily",
    icon: "time-outline" as const,
    times: ["09:00", "15:00", "21:00"],
  },
  {
    id: "4",
    label: "Four times daily",
    icon: "repeat-outline" as const,
    times: ["09:00", "13:00", "17:00", "21:00"],
  },
  { id: "5", label: "As needed", icon: "calendar-outline" as const, times: [] },
];

const DURATIONS = [
  { id: "1", label: "7 days", value: 7 },
  { id: "2", label: "14 days", value: 14 },
  { id: "3", label: "30 days", value: 30 },
  { id: "4", label: "90 days", value: 90 },
  { id: "5", label: "Ongoing", value: -1 },
];

export default function EditMedicationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const medicationId = params.medicationId as string;
  
  const [form, setForm] = useState({
    id: "",
    name: "",
    dosage: "",
    frequency: "",
    duration: "",
    startDate: new Date(),
    times: ["09:00"],
    notes: "",
    reminderEnabled: true,
    refillReminder: false,
    currentSupply: "",
    refillAt: "",
    totalSupply: 0,
    color: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTimeIndex, setActiveTimeIndex] = useState(0);

  // Load existing medication data
  useEffect(() => {
    const loadMedication = async () => {
      try {
        const medications = await getMedications();
        const medication = medications.find(med => med.id === medicationId);
        
        if (medication) {
          // Format data for the form
          setForm({
            id: medication.id,
            name: medication.name,
            dosage: medication.dosage,
            frequency: FREQUENCIES.find(f => f.times.length === medication.times.length)?.label || "",
            duration: medication.duration,
            startDate: new Date(medication.startDate),
            times: medication.times,
            notes: medication.notes || "",
            reminderEnabled: medication.reminderEnabled,
            refillReminder: medication.refillReminder,
            currentSupply: medication.currentSupply.toString(),
            refillAt: medication.refillAt.toString(),
            totalSupply: medication.totalSupply,
            color: medication.color,
          });
          
          // Set selected frequency and duration
          const frequencyMatch = FREQUENCIES.find(f => 
            f.times.length === medication.times.length
          );
          if (frequencyMatch) {
            setSelectedFrequency(frequencyMatch.label);
          }
          
          const durationMatch = DURATIONS.find(d => 
            medication.duration.includes(d.label)
          );
          if (durationMatch) {
            setSelectedDuration(durationMatch.label);
          }
        } else {
          Alert.alert("Error", "Medication not found");
          router.back();
        }
      } catch (error) {
        console.error("Error loading medication:", error);
        Alert.alert("Error", "Failed to load medication data");
      }
    };
    
    if (medicationId) {
      loadMedication();
    }
  }, [medicationId]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!form.name.trim()) {
      newErrors.name = "Medication name is required";
    }

    if (!form.dosage.trim()) {
      newErrors.dosage = "Dosage is required";
    }

    if (!form.frequency) {
      newErrors.frequency = "Frequency is required";
    }

    if (!form.duration) {
      newErrors.duration = "Duration is required";
    }

    if (form.refillReminder) {
      if (!form.currentSupply) {
        newErrors.currentSupply =
          "Current supply is required for refill tracking";
      }
      if (!form.refillAt) {
        newErrors.refillAt = "Refill alert threshold is required";
      }
      if (Number(form.refillAt) >= Number(form.currentSupply)) {
        newErrors.refillAt = "Refill alert must be less than current supply";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    try {
      if (!validateForm()) {
        Alert.alert("Error", "Please fill in all required fields correctly");
        return;
      }

      if (isSubmitting) return;
      setIsSubmitting(true);

      const medicationData: Medication = {
        ...form,
        currentSupply: form.currentSupply ? Number(form.currentSupply) : 0,
        totalSupply: form.totalSupply,
        refillAt: form.refillAt ? Number(form.refillAt) : 0,
        startDate: form.startDate.toISOString(),
      };

      await updateMedication(medicationData);
      await updateMedicationReminders(medicationData);

      Alert.alert(
        "Success",
        "Medication updated successfully",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert(
        "Error",
        "Failed to update medication. Please try again.",
        [{ text: "OK" }],
        { cancelable: false }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFrequencySelect = (freq: string) => {
    setSelectedFrequency(freq);
    const selectedFreq = FREQUENCIES.find((f) => f.label === freq);
    setForm((prev) => ({
      ...prev,
      frequency: freq,
      times: selectedFreq?.times || [],
    }));
    if (errors.frequency) {
      setErrors((prev) => ({ ...prev, frequency: "" }));
    }
  };

  const handleDurationSelect = (duration: string) => {
    setSelectedDuration(duration);
    setForm((prev) => ({
      ...prev,
      duration,
    }));
    if (errors.duration) {
      setErrors((prev) => ({ ...prev, duration: "" }));
    }
  };

  const handleTimeChange = (
    event: any,
    selectedTime: Date | undefined,
    index: number
  ) => {
    setShowTimePicker(Platform.OS === "ios");

    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, "0");
      const minutes = selectedTime.getMinutes().toString().padStart(2, "0");
      const timeString = `${hours}:${minutes}`;

      const updatedTimes = [...form.times];
      updatedTimes[index] = timeString;

      setForm((prev) => ({
        ...prev,
        times: updatedTimes,
      }));
    }
  };

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(Platform.OS === "ios");

    if (selectedDate) {
      setForm((prev) => ({
        ...prev,
        startDate: selectedDate,
      }));
    }
  };

  const handleUpdateMedication = async () => {
    if (!form.name || !form.dosage || !form.frequency || !form.startDate || !form.duration) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);

      // Use the custom times set by the user instead of regenerating them
      const updatedMedication = {
        ...form,
        name: form.name,
        dosage: form.dosage,
        // Use form.times directly instead of calling parseFrequencyToTimes
        times: form.times,
        startDate: form.startDate.toISOString(),
        duration: form.duration,
        color: form.color,
        reminderEnabled: form.reminderEnabled,
        currentSupply: parseInt(form.currentSupply) || 0,
        totalSupply: parseInt(form.totalSupply) || 0,
        refillAt: parseInt(form.refillAt) || 20,
        refillReminder: form.refillReminder,
        notes: form.notes,
      };

      // Update in storage
      const existingMeds = await getMedications();
      const updatedMeds = existingMeds.map(med => 
        med.id === form.id ? updatedMedication : med
      );
      await updateMedication(updatedMedication);

      // Update reminders
      if (form.reminderEnabled) {
        await updateMedicationReminders(updatedMedication);
      }

      Alert.alert(
        'Success',
        'Medication updated successfully',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error updating medication:', error);
      Alert.alert('Error', 'Failed to update medication');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={["#1a8e2d", "#146922"]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Medication</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Medication Details */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Medication Name</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Enter medication name"
                placeholderTextColor="#999"
                value={form.name}
                onChangeText={(text) => {
                  setForm({ ...form, name: text });
                  if (errors.name) {
                    setErrors({ ...errors, name: "" });
                  }
                }}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Dosage</Text>
              <TextInput
                style={[styles.input, errors.dosage && styles.inputError]}
                placeholder="e.g., 10mg, 1 tablet"
                placeholderTextColor="#999"
                value={form.dosage}
                onChangeText={(text) => {
                  setForm({ ...form, dosage: text });
                  if (errors.dosage) {
                    setErrors({ ...errors, dosage: "" });
                  }
                }}
              />
              {errors.dosage && (
                <Text style={styles.errorText}>{errors.dosage}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Frequency Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequency</Text>
          <View style={styles.card}>
            {FREQUENCIES.map((freq) => (
              <TouchableOpacity
                key={freq.id}
                style={[
                  styles.optionButton,
                  selectedFrequency === freq.label && styles.selectedOption,
                ]}
                onPress={() => handleFrequencySelect(freq.label)}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons
                    name={freq.icon}
                    size={24}
                    color={
                      selectedFrequency === freq.label ? "#1a8e2d" : "#666"
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.optionText,
                    selectedFrequency === freq.label && styles.selectedOptionText,
                  ]}
                >
                  {freq.label}
                </Text>
              </TouchableOpacity>
            ))}
            {errors.frequency && (
              <Text style={styles.errorText}>{errors.frequency}</Text>
            )}
          </View>
        </View>

        {/* Duration Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duration</Text>
          <View style={styles.card}>
            <View style={styles.durationOptions}>
              {DURATIONS.map((duration) => (
                <TouchableOpacity
                  key={duration.id}
                  style={[
                    styles.durationButton,
                    selectedDuration === duration.label && styles.selectedDuration,
                  ]}
                  onPress={() => handleDurationSelect(duration.label)}
                >
                  <Text
                    style={[
                      styles.durationText,
                      selectedDuration === duration.label &&
                        styles.selectedDurationText,
                    ]}
                  >
                    {duration.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.duration && (
              <Text style={styles.errorText}>{errors.duration}</Text>
            )}
          </View>
        </View>

        {/* Timing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timing</Text>
          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text>
                  {form.startDate.toLocaleDateString("default", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Reminder Times</Text>
              {form.times.length > 0 ? (
                <View style={styles.timesList}>
                  {form.times.map((time, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.timeChip}
                      onPress={() => {
                        setActiveTimeIndex(index);
                        setShowTimePicker(true);
                      }}
                    >
                      <Ionicons name="time-outline" size={16} color="#1a8e2d" />
                      <Text style={styles.timeChipText}>{time}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.noTimesText}>
                  No reminder times selected
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Reminders */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <View style={styles.iconContainer}>
                  <Ionicons name="notifications" size={20} color="#1a8e2d" />
                </View>
                <View>
                  <Text style={styles.switchLabel}>Reminders</Text>
                  <Text style={styles.switchSubLabel}>
                    Get notified when it's time to take your medication
                  </Text>
                </View>
              </View>
              <Switch
                value={form.reminderEnabled}
                onValueChange={(value) =>
                  setForm({ ...form, reminderEnabled: value })
                }
                trackColor={{ false: "#ddd", true: "#1a8e2d" }}
                thumbColor="white"
              />
            </View>
          </View>
        </View>

        {/* Refill Tracking */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <View style={styles.iconContainer}>
                  <Ionicons name="reload" size={20} color="#1a8e2d" />
                </View>
                <View>
                  <Text style={styles.switchLabel}>Refill Tracking</Text>
                  <Text style={styles.switchSubLabel}>
                    Get notified when you need to refill
                  </Text>
                </View>
              </View>
              <Switch
                value={form.refillReminder}
                onValueChange={(value) => {
                  setForm({ ...form, refillReminder: value });
                  if (!value) {
                    setErrors({
                      ...errors,
                      currentSupply: "",
                      refillAt: "",
                    });
                  }
                }}
                trackColor={{ false: "#ddd", true: "#1a8e2d" }}
                thumbColor="white"
              />
            </View>
            {form.refillReminder && (
              <View style={styles.refillInputs}>
                <View style={styles.inputRow}>
                  <View style={[styles.inputContainer, styles.flex1]}>
                    <TextInput
                      style={[
                        styles.input,
                        errors.currentSupply && styles.inputError,
                      ]}
                      placeholder="Current Supply"
                      placeholderTextColor="#999"
                      value={form.currentSupply}
                      onChangeText={(text) => {
                        setForm({ ...form, currentSupply: text });
                        if (errors.currentSupply) {
                          setErrors({ ...errors, currentSupply: "" });
                        }
                      }}
                      keyboardType="numeric"
                    />
                    {errors.currentSupply && (
                      <Text style={styles.errorText}>
                        {errors.currentSupply}
                      </Text>
                    )}
                  </View>
                  <View style={styles.spacer} />
                  <View style={[styles.inputContainer, styles.flex1]}>
                    <TextInput
                      style={[
                        styles.input,
                        errors.refillAt && styles.inputError,
                      ]}
                      placeholder="Refill Alert"
                      placeholderTextColor="#999"
                      value={form.refillAt}
                      onChangeText={(text) => {
                        setForm({ ...form, refillAt: text });
                        if (errors.refillAt) {
                          setErrors({ ...errors, refillAt: "" });
                        }
                      }}
                      keyboardType="numeric"
                    />
                    {errors.refillAt && (
                      <Text style={styles.errorText}>{errors.refillAt}</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.helpText}>
                  You'll be alerted when your supply drops below the refill
                  threshold
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleUpdateMedication}
          disabled={isSubmitting}
        >
          <Text style={styles.saveButtonText}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {showDatePicker && (
        <View style={styles.dateTimePickerContainer}>
          <BlurView
            intensity={30}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.dateTimePickerContent}>
            <View style={styles.dateTimePickerHeader}>
              <Text style={styles.dateTimePickerTitle}>Select Start Date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {Platform.OS === 'ios' ? (
              <>
                <DateTimePicker
                  value={form.startDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </>
            ) : (
              <DateTimePicker
                value={form.startDate}
                mode="date"
                display="default"
                onChange={(e, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setForm(prev => ({
                      ...prev,
                      startDate: selectedDate
                    }));
                  }
                }}
                minimumDate={new Date()}
              />
            )}
          </View>
        </View>
      )}

      {showTimePicker && (
        <View style={styles.dateTimePickerContainer}>
          <BlurView
            intensity={30}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.dateTimePickerContent}>
            <View style={styles.dateTimePickerHeader}>
              <Text style={styles.dateTimePickerTitle}>Select Time</Text>
              <TouchableOpacity
                onPress={() => setShowTimePicker(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {Platform.OS === 'ios' ? (
              <>
                <DateTimePicker
                  value={(() => {
                    const [hours, minutes] = form.times[activeTimeIndex]
                      .split(":")
                      .map(Number);
                    const date = new Date();
                    date.setHours(hours, minutes, 0, 0);
                    return date;
                  })()}
                  mode="time"
                  display="spinner"
                  onChange={(e, d) => handleTimeChange(e, d, activeTimeIndex)}
                />
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </>
            ) : (
              <DateTimePicker
                value={(() => {
                  const [hours, minutes] = form.times[activeTimeIndex]
                    .split(":")
                    .map(Number);
                  const date = new Date();
                  date.setHours(hours, minutes, 0, 0);
                  return date;
                })()}
                mode="time"
                display="default"
                onChange={(e, selectedTime) => {
                  setShowTimePicker(false);
                  if (selectedTime) {
                    const hours = selectedTime.getHours().toString().padStart(2, "0");
                    const minutes = selectedTime.getMinutes().toString().padStart(2, "0");
                    const timeString = `${hours}:${minutes}`;
                    
                    const updatedTimes = [...form.times];
                    updatedTimes[activeTimeIndex] = timeString;
                    
                    setForm(prev => ({
                      ...prev,
                      times: updatedTimes
                    }));
                  }
                }}
              />
            )}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    height: Platform.OS === "ios" ? 120 : 100,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#333",
  },
  inputError: {
    borderColor: "#f44336",
  },
  errorText: {
    color: "#f44336",
    fontSize: 14,
    marginTop: 4,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    marginBottom: 12,
  },
  selectedOption: {
    borderColor: "#1a8e2d",
    backgroundColor: "#f0f9f1",
  },
  optionIconContainer: {
    marginRight: 15,
  },
  optionText: {
    fontSize: 16,
    color: "#666",
  },
  selectedOptionText: {
    color: "#1a8e2d",
    fontWeight: "600",
  },
  durationOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  durationButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    margin: 5,
    minWidth: (width - 70) / 3,
    alignItems: "center",
  },
  selectedDuration: {
    borderColor: "#1a8e2d",
    backgroundColor: "#f0f9f1",
  },
  durationText: {
    fontSize: 14,
    color: "#666",
  },
  selectedDurationText: {
    color: "#1a8e2d",
    fontWeight: "600",
  },
  dateInput: {
    height: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9f1",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  timeChipText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
  },
  noTimesText: {
    color: "#999",
    fontStyle: "italic",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f9f1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  switchSubLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  refillInputs: {
    marginTop: 20,
  },
  inputRow: {
    flexDirection: "row",
  },
  flex1: {
    flex: 1,
  },
  spacer: {
    width: 12,
  },
  helpText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: "#1a8e2d",
    borderRadius: 16,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  dateTimePickerContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 1000,
  },
  dateTimePickerContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  dateTimePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  dateTimePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    padding: 8,
  },
  confirmButton: {
    backgroundColor: "#1a8e2d",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 20,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
}); 