import { useState, useRef, useEffect } from "react";
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
  FlatList,
  Modal,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { addMedication } from "../../utils/storage";
import {
  scheduleMedicationReminder,
  scheduleRefillReminder,
} from "../../utils/notifications";
import { showSuccessToast, showErrorToast } from "../../utils/toast";

const { width } = Dimensions.get("window");

const FREQUENCIES = [
  { id: "1", label: "Once daily", times: ["09:00"] },
  { id: "2", label: "Twice daily", times: ["09:00", "21:00"] },
  { id: "3", label: "Thrice daily", times: ["09:00", "15:00", "21:00"] },
  { id: "4", label: "Four times", times: ["09:00", "13:00", "17:00", "21:00"] },
  { id: "5", label: "As needed", times: [] },
];

const DURATIONS = [
  { id: "1", label: "7 days", value: 7 },
  { id: "2", label: "14 days", value: 14 },
  { id: "3", label: "30 days", value: 30 },
  { id: "4", label: "90 days", value: 90 },
  { id: "5", label: "Ongoing", value: -1 },
];

export default function AddMedicationScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    dosage: "",
    frequency: "Twice daily",
    duration: "14 days",
    startDate: new Date(),
    times: ["09:00", "21:00"],
    notes: "",
    reminderEnabled: true,
    refillReminder: false,
    currentSupply: "",
    refillAt: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(0);
  
  // Frequency and duration wheel modals
  const [frequencyModalVisible, setFrequencyModalVisible] = useState(false);
  const [durationModalVisible, setDurationModalVisible] = useState(false);

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
        showErrorToast("Please fill in all required fields correctly");
        return;
      }

      if (isSubmitting) return;
      setIsSubmitting(true);

      // Generate a random color
      const colors = ["#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const medicationData = {
        id: Math.random().toString(36).substr(2, 9),
        ...form,
        currentSupply: form.currentSupply ? Number(form.currentSupply) : 0,
        totalSupply: form.currentSupply ? Number(form.currentSupply) : 0,
        refillAt: form.refillAt ? Number(form.refillAt) : 0,
        startDate: form.startDate.toISOString(),
        color: randomColor,
      };

      await addMedication(medicationData);

      // Schedule reminders if enabled
      if (medicationData.reminderEnabled) {
        await scheduleMedicationReminder(medicationData);
      }
      if (medicationData.refillReminder) {
        await scheduleRefillReminder(medicationData);
      }

      showSuccessToast("Medication added successfully");
      router.back();
    } catch (error) {
      console.error("Save error:", error);
      showErrorToast("Failed to save medication. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFrequencySelect = (item: any) => {
    const selectedFreq = FREQUENCIES.find((f) => f.label === item.label);
    setForm((prev) => ({
      ...prev,
      frequency: item.label,
      times: selectedFreq?.times || [],
    }));
    setFrequencyModalVisible(false);
  };

  const handleDurationSelect = (item: any) => {
    setForm((prev) => ({ ...prev, duration: item.label }));
    setDurationModalVisible(false);
  };

  // Initialize form with default values
  useEffect(() => {
    // Default to twice daily and 14 days
    const twiceDailyFreq = FREQUENCIES.find(f => f.label === "Twice daily");
    if (twiceDailyFreq) {
      setForm(prev => ({
        ...prev,
        frequency: twiceDailyFreq.label,
        times: twiceDailyFreq.times
      }));
    }
  }, []);

  // Frequency wheel modal
  const renderFrequencyModal = () => (
    <Modal
      visible={frequencyModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setFrequencyModalVisible(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Frequency</Text>
            <TouchableOpacity onPress={() => setFrequencyModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={FREQUENCIES}
            renderItem={({ item }) => (
          <TouchableOpacity
            style={[
                  styles.modalOption,
                  form.frequency === item.label && styles.modalOptionSelected
                ]}
                onPress={() => handleFrequencySelect(item)}
              >
            <Text
              style={[
                    styles.modalOptionText,
                    form.frequency === item.label && styles.modalOptionTextSelected
              ]}
            >
                  {item.label}
            </Text>
          </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
          />
      </View>
      </SafeAreaView>
    </Modal>
  );

  // Duration wheel modal
  const renderDurationModal = () => (
    <Modal
      visible={durationModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setDurationModalVisible(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Duration</Text>
            <TouchableOpacity onPress={() => setDurationModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={DURATIONS}
            renderItem={({ item }) => (
          <TouchableOpacity
            style={[
                  styles.modalOption,
                  form.duration === item.label && styles.modalOptionSelected
            ]}
                onPress={() => handleDurationSelect(item)}
          >
            <Text
              style={[
                    styles.modalOptionText,
                    form.duration === item.label && styles.modalOptionTextSelected
                  ]}
                >
                  {item.label}
            </Text>
          </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
          />
      </View>
      </SafeAreaView>
    </Modal>
  );

  const updateTime = (time: string, index: number) => {
    setForm(prev => ({
      ...prev,
      times: prev.times.map((t, i) => i === index ? time : t)
    }));
  };

  return (
    <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
          <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Medication</Text>
        </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.formContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.formContentContainer}
        >
          {/* Basic Information */}
          <View style={styles.basicInfoSection}>
              <TextInput
              style={styles.nameInput}
              placeholder="Medication name"
                placeholderTextColor="#999"
                value={form.name}
                onChangeText={(text) => {
                  setForm({ ...form, name: text });
                  if (errors.name) {
                    setErrors({ ...errors, name: "" });
                  }
                }}
              />
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
            
              <TextInput
              style={styles.dosageInput}
                placeholder="Dosage (e.g., 500mg)"
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

          {/* Frequency and Duration */}
          <View style={styles.scheduleSection}>
            <View style={styles.frequencyDurationRow}>
              <View style={styles.scheduleColumn}>
                <Text style={styles.scheduleLabel}>Every</Text>
                <TouchableOpacity 
                  style={styles.scheduleValue}
                  onPress={() => setFrequencyModalVisible(true)}
                >
                  <Text style={styles.scheduleValueText}>{form.frequency}</Text>
                </TouchableOpacity>
          </View>

              <View style={styles.scheduleColumn}>
                <Text style={styles.scheduleLabel}>For</Text>
                <TouchableOpacity 
                  style={styles.scheduleValue}
                  onPress={() => setDurationModalVisible(true)}
                >
                  <Text style={styles.scheduleValueText}>{form.duration}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.dateRow}>
              <Text style={styles.scheduleLabel}>Starts</Text>
            <TouchableOpacity
                style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
                <Text style={styles.dateValue}>
                  {form.startDate.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  }).replace(/\//g, '/')}
              </Text>
                <Ionicons name="calendar" size={24} color="#666" />
            </TouchableOpacity>
            </View>

            {showDatePicker && (
              Platform.OS === 'ios' ? (
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity 
                      onPress={() => setShowDatePicker(false)}
                      style={styles.pickerButton}
                    >
                      <Text style={styles.pickerCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setShowDatePicker(false)}
                      style={styles.pickerButton}
                    >
                      <Text style={styles.pickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={form.startDate}
                    mode="date"
                    display="spinner"
                    onChange={(event, date) => {
                      if (date) setForm({ ...form, startDate: date });
                    }}
                    minimumDate={new Date()}
                  />
                </View>
              ) : (
                <DateTimePicker
                  value={form.startDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) setForm({ ...form, startDate: date });
                  }}
                  minimumDate={new Date()}
                />
              )
            )}

            {form.frequency && form.frequency !== "As needed" && (
              <View style={styles.timesContainer}>
                <Text style={styles.sectionLabel}>Medication Times</Text>
                {form.times.map((time, index) => (
                  <View key={index} style={styles.timeRow}>
                    <Text style={styles.timeText}>{time}</Text>
                  <TouchableOpacity
                      style={styles.timePickerButton}
                    onPress={() => {
                        setSelectedTimeIndex(index);
                      setShowTimePicker(true);
                    }}
                  >
                      <Ionicons name="time-outline" size={24} color="#666" />
                  </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {showTimePicker && (
              Platform.OS === 'ios' ? (
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity 
                      onPress={() => setShowTimePicker(false)}
                      style={styles.pickerButton}
                    >
                      <Text style={styles.pickerCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setShowTimePicker(false)}
                      style={styles.pickerButton}
                    >
                      <Text style={styles.pickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={(() => {
                      const [hours, minutes] = form.times[selectedTimeIndex].split(":").map(Number);
                      const date = new Date();
                      date.setHours(hours, minutes, 0, 0);
                      return date;
                    })()}
                    mode="time"
                    display="spinner"
                    onChange={(event, date) => {
                      if (date) {
                        const newTime = date.toLocaleTimeString("default", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        });
                        updateTime(newTime, selectedTimeIndex);
                      }
                    }}
                  />
                </View>
              ) : (
                <DateTimePicker
                  value={(() => {
                    const [hours, minutes] = form.times[selectedTimeIndex].split(":").map(Number);
                    const date = new Date();
                    date.setHours(hours, minutes, 0, 0);
                    return date;
                  })()}
                  mode="time"
                  display="default"
                  onChange={(event, date) => {
                    setShowTimePicker(false);
                    if (date) {
                      const newTime = date.toLocaleTimeString("default", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      });
                      updateTime(newTime, selectedTimeIndex);
                    }
                  }}
                />
              )
            )}
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <TextInput
              style={styles.notesInput}
              placeholder="Add notes or special instructions..."
              placeholderTextColor="#999"
              value={form.notes}
              onChangeText={(text) => setForm({ ...form, notes: text })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
                  </View>

          {/* Reminders - After scroll */}
          <View style={styles.section}>
            <View style={styles.settingRow}>
                  <View>
                <Text style={styles.settingLabel}>Reminders</Text>
                <Text style={styles.settingSubLabel}>
                      Get notified when it's time to take your medication
                    </Text>
                </View>
                <Switch
                  value={form.reminderEnabled}
                  onValueChange={(value) =>
                    setForm({ ...form, reminderEnabled: value })
                  }
                trackColor={{ false: "#ddd", true: "#5669FF" }}
                  thumbColor="white"
                ios_backgroundColor="#ddd"
                />
            </View>
          </View>

          {/* Refill Tracking - After scroll */}
          <View style={styles.section}>
            <View style={styles.settingRow}>
                  <View>
                <Text style={styles.settingLabel}>Refill Tracking</Text>
                <Text style={styles.settingSubLabel}>
                      Get notified when you need to refill
                    </Text>
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
                trackColor={{ false: "#ddd", true: "#5669FF" }}
                  thumbColor="white"
                ios_backgroundColor="#ddd"
                />
              </View>
            
              {form.refillReminder && (
                <View style={styles.refillInputs}>
                  <View style={styles.inputRow}>
                  <View style={{ flex: 1, paddingHorizontal: 5 }}>
                    <Text style={styles.inputLabel}>Current Supply</Text>
                      <TextInput
                        style={[
                        styles.refillInput,
                          errors.currentSupply && styles.inputError,
                        ]}
                      placeholder="Quantity"
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
                  <View style={{ flex: 1, paddingHorizontal: 5 }}>
                    <Text style={styles.inputLabel}>Alert at</Text>
                      <TextInput
                        style={[
                        styles.refillInput,
                          errors.refillAt && styles.inputError,
                        ]}
                      placeholder="Quantity"
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
                </View>
              )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

        <View style={styles.footer}>
          <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
            disabled={isSubmitting}
          >
          <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        
          <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
            disabled={isSubmitting}
          >
          <Text style={styles.saveButtonText}>
            {isSubmitting ? "Adding..." : "Save"}
          </Text>
          </TouchableOpacity>
        </View>

      {renderFrequencyModal()}
      {renderDurationModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e6f2ff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 15,
    backgroundColor: "#f0f7ff",
    borderBottomWidth: 1,
    borderBottomColor: "#d9e8ff",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    marginLeft: 10,
  },
  formContainer: {
    flex: 1,
  },
  formContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  basicInfoSection: {
    marginBottom: 30,
  },
  nameInput: {
    fontSize: 18,
    color: "#333",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginBottom: 20,
  },
  dosageInput: {
    fontSize: 18,
    color: "#333",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  section: {
    marginBottom: 25,
  },
  scheduleSection: {
    marginBottom: 30,
  },
  frequencyDurationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  scheduleColumn: {
    width: '48%',
  },
  scheduleLabel: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
    textAlign: "center",
  },
  sectionLabel: {
    fontSize: 16,
    color: "#666",
    marginBottom: 15,
  },
  scheduleValue: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleValueText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#333",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 15,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateValue: {
    fontSize: 18,
    color: "#333",
    marginRight: 10,
  },
  timesContainer: {
    marginTop: 20,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  timeText: {
    fontSize: 22,
    color: "#333",
  },
  timePickerButton: {
    padding: 5,
  },
  notesInput: {
    height: 100,
    padding: 15,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "white",
    textAlignVertical: "top",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  settingSubLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  inputLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  inputRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  refillInput: {
    padding: 15,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "white",
  },
  refillInputs: {
    marginTop: 10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#d9e8ff",
    backgroundColor: "#f0f7ff",
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 18,
    color: "#333",
  },
  saveButton: {
    flex: 1,
    padding: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 18,
    color: "#5669FF",
    fontWeight: "600",
  },
  pickerContainer: {
    backgroundColor: 'white',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerButton: {
    paddingHorizontal: 10,
  },
  pickerCancelText: {
    color: '#666',
    fontSize: 16,
  },
  pickerDoneText: {
    color: '#5669FF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingBottom: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalOption: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionSelected: {
    backgroundColor: '#f0f4ff',
  },
  modalOptionText: {
    fontSize: 18,
    color: '#333',
  },
  modalOptionTextSelected: {
    color: '#5669FF',
    fontWeight: '600',
  },
  inputError: {
    borderColor: "#FF5252",
  },
  errorText: {
    color: "#FF5252",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 5,
  },
});
