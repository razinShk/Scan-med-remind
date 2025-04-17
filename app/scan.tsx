import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { extractMedicineData, Medicine, convertToAppMedication } from '../utils/medicineTextExtraction';
import { Camera as CameraIcon, Upload, X, FileText } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { getMedications, addMedication } from '../utils/storage';

// When a scan is completed, make sure it's saved to AsyncStorage
async function validateAndRefreshMedications(medicines: any[]): Promise<boolean> {
  try {
    // Check if medications are already in storage
    const currentMedications = await getMedications();
    console.log(`Current medications count: ${currentMedications.length}`);
    
    let needsUpdate = false;
    const existingIds = currentMedications.map(med => med.id);
    
    // Log the medicine IDs we're looking for
    console.log("Scanned medicine IDs:", medicines.map(med => med.id).join(", "));
    console.log("Existing medicine IDs:", existingIds.join(", "));
    
    // Ensure medications are properly formatted before adding them to storage
    const processedMedications = medicines.map(med => {
      // Make sure times is an array
      if (!med.times || !Array.isArray(med.times) || med.times.length === 0) {
        console.log(`Fixing times for medicine ${med.name}`);
        
        // Extract times from frequency if possible
        let times = [];
        const freq = (med.frequency || '').toLowerCase();
        
        if (freq.includes('once') || freq.includes('daily') || freq.includes('1 time')) {
          times = ['09:00'];
        } else if (freq.includes('twice') || freq.includes('2 times') || freq.includes('bid')) {
          times = ['09:00', '20:00'];
        } else if (freq.includes('three') || freq.includes('3 times') || freq.includes('tid')) {
          times = ['09:00', '14:00', '20:00'];
        } else if (freq.includes('four') || freq.includes('4 times') || freq.includes('qid')) {
          times = ['09:00', '13:00', '17:00', '21:00'];
        } else {
          times = ['09:00']; // Default
        }
        
        med.times = times;
      }
      
      // Ensure other required fields exist
      med.name = med.name || 'Unnamed Medication';
      med.dosage = med.dosage || 'No dosage information';
      med.startDate = med.startDate || new Date().toISOString();
      med.duration = med.duration || '30 days';
      med.reminderEnabled = med.reminderEnabled !== false; // Default to true
      
      return med;
    });
    
    // Check if any of the scanned medicines are missing and add them
    for (const med of processedMedications) {
      if (!existingIds.includes(med.id)) {
        console.log(`Medicine ${med.name} (${med.id}) not found in storage, adding it`);
        await addMedication(med);
        needsUpdate = true;
      } else {
        console.log(`Medicine ${med.name} (${med.id}) already in storage`);
      }
    }
    
    if (needsUpdate) {
      console.log("Updated medications in storage");
      
      // Write a flag to indicate new medications were added
      await AsyncStorage.setItem('LAST_SCAN_TIMESTAMP', new Date().toISOString());
    }
    
    return needsUpdate;
  } catch (error) {
    console.error("Error validating medications:", error);
    return false;
  }
}

export default function ScanScreen() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processSuccess, setProcessSuccess] = useState(false);

  const processImage = async (base64Image: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      // Extract medicine data from image
      const { extractedText, medicines } = await extractMedicineData(base64Image);
      setExtractedText(extractedText);
      
      if (!medicines || medicines.length === 0) {
        setError('No medicines were found in the image. Please try again with a clearer image.');
        return;
      }

      console.log(`Extracted ${medicines.length} medicines from image`);
      setProcessSuccess(true);
      
      // Convert medicines to app format
      const medicationsForStorage = medicines.map(medicine => {
        try {
          // Try to convert using the utility function
          return convertToAppMedication(medicine);
        } catch (err) {
          console.error(`Error converting medicine ${medicine.name}:`, err);
          
          // Fallback to manual conversion if needed
          return {
            id: medicine.id || generateId(),
            name: medicine.name || 'Unnamed Medication',
            dosage: medicine.dosage || 'No dosage specified',
            times: ['09:00'], // Default time
            startDate: new Date().toISOString(),
            duration: medicine.duration || '30 days',
            color: '#4CAF50',
            reminderEnabled: true,
            currentSupply: 30,
            totalSupply: 30,
            refillAt: 6,
            refillReminder: true
          };
        }
      });
      
      // Validate and ensure the medicines are in storage
      const updated = await validateAndRefreshMedications(medicationsForStorage);
      
      if (updated) {
        console.log("Medications were updated in storage");
      } else {
        console.log("No new medications were added");
      }
      
      // Directly add processed medications to AsyncStorage
      const currentMeds = await getMedications();
      console.log(`Total medications after update: ${currentMeds.length}`);
      
      Alert.alert(
        'Success!',
        `Successfully added ${medicines.length} medication(s) with reminders:\n\n${medicines.map(m => `• ${m.name} (${m.dosage})`).join('\n')}`,
        [
          { 
            text: 'View Medicines',
            onPress: () => {
              // Force immediate navigation to ensure data refresh
              router.replace('/home');
            },
          },
          { 
            text: 'View Raw Text',
            onPress: () => setShowRawText(true),
          },
          {
            text: 'Scan Another',
            onPress: () => {
              setSelectedImage(null);
              setExtractedText(null);
              setProcessSuccess(false);
            },
          },
        ]
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(`Failed to extract medicine details: ${errorMessage}`);
      console.error('Error processing image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Simple ID generator for fallback
  function generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  const pickImage = async (useCamera = false) => {
    try {
      setError(null);
      setProcessSuccess(false);
      
      let result;
      if (useCamera) {
        // Request camera permission
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setError('Camera permission is required to take a picture');
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
          base64: true,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0].base64) {
        setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        await processImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setError('Failed to pick image. Please try again.');
    }
  };

  const tryAgain = () => {
    setSelectedImage(null);
    setExtractedText(null);
    setProcessSuccess(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#a64bf4', '#c56cf0']}
        style={styles.gradientBackground}
      >
        {selectedImage ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            {isProcessing && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.loadingText}>{extractedText ? 'Identifying medicine information...' : 'Reading text from image...'}</Text>
              </View>
            )}
            
            <View style={styles.buttonContainer}>
              {processSuccess ? (
                <>
                  <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={() => setShowRawText(true)}
                  >
                    <FileText size={20} color="white" />
                    <Text style={styles.actionButtonText}>View Text</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={() => router.push('/home')}
                  >
                    <Text style={styles.actionButtonText}>View Medicines</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={tryAgain}
                  disabled={isProcessing}
                >
                  <Text style={styles.actionButtonText}>Try Again</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.fullScreenContent}>
            <View style={styles.iconContainer}>
              <View style={styles.iconWrapper}>
                <FileText size={60} color="#ffffff" />
                <CameraIcon size={36} color="#ffffff" style={styles.cameraOverlay} />
              </View>
            </View>
            
            <Text style={styles.title}>Scan Your Prescription</Text>
            <Text style={styles.subtitle}>
              Upload or snap a photo of your prescription for easy medicine reminder setup.
            </Text>
            
            <TouchableOpacity 
              style={styles.takePhotoButton} 
              onPress={() => pickImage(true)}
              disabled={isProcessing}
            >
              <CameraIcon size={24} color="#a64bf4" style={styles.optionIcon} />
              <Text style={styles.takePhotoText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.uploadButton} 
              onPress={() => pickImage(false)}
              disabled={isProcessing}
            >
              <Upload size={24} color="#ffffff" style={styles.optionIcon} />
              <Text style={styles.uploadText}>Upload from Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Modal
          visible={showRawText}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowRawText(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Extracted Text</Text>
                <TouchableOpacity
                  onPress={() => setShowRawText(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.extractedText}>
                  {extractedText || 'No text extracted'}
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullScreenContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 30,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#a64bf4',
    padding: 6,
    borderRadius: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 50,
    paddingHorizontal: 10,
  },
  takePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 15,
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 15,
    width: '100%',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  optionIcon: {
    marginRight: 12,
  },
  takePhotoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a64bf4',
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  actionButton: {
    backgroundColor: '#a64bf4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 6,
  },
  errorContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    padding: 16,
    borderRadius: 12,
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 8,
  },
  modalScroll: {
    maxHeight: '90%',
  },
  extractedText: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 24,
  },
});