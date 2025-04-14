import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../services/AuthContext';

// Define the Nurse type
interface Nurse {
  id: string;
  email: string;
  name: string;
  specialty?: string;
  hospital?: string;
}

// Mock data for available nurses
const mockNurses: Nurse[] = [
  { id: '101', name: 'Dr. Emily Johnson', email: 'emily.j@healthcare.com', specialty: 'Cardiology', hospital: 'Central Hospital' },
  { id: '102', name: 'Dr. Robert Smith', email: 'robert.s@healthcare.com', specialty: 'Neurology', hospital: 'City Medical Center' },
  { id: '103', name: 'Dr. Lisa Wong', email: 'lisa.w@healthcare.com', specialty: 'Pediatrics', hospital: 'Children\'s Hospital' },
];

// This is a placeholder for Firebase implementation
// We'll implement the actual Firebase integration in step 2
const mockConnectedNurses = [
  { id: '1', email: 'nurse1@example.com', name: 'Sarah Johnson' },
  { id: '2', email: 'nurse2@example.com', name: 'Michael Chen' },
];

export default function NurseScreen() {
  const router = useRouter();
  const { user, isSubscribed } = useAuth();
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connectedNurses, setConnectedNurses] = useState(mockConnectedNurses);
  const [upgradeRequired, setUpgradeRequired] = useState(!isSubscribed);
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Check subscription status
    setUpgradeRequired(!isSubscribed);
    
    // Load connected nurses from AsyncStorage
    const loadConnectedNurses = async () => {
      try {
        const savedNurses = await AsyncStorage.getItem('connectedNurses');
        if (savedNurses) {
          setConnectedNurses(JSON.parse(savedNurses));
        }
      } catch (error) {
        console.error('Error loading connected nurses:', error);
      }
    };
    
    // Mock data loading effect
    setLoading(true);
    setTimeout(() => {
      // Simulating API fetch completion
      setNurses(mockNurses);
      setLoading(false);
    }, 1000);
    
    loadConnectedNurses();
  }, [isSubscribed]);
  
  // Save connected nurses to AsyncStorage whenever they change
  useEffect(() => {
    const saveConnectedNurses = async () => {
      try {
        await AsyncStorage.setItem('connectedNurses', JSON.stringify(connectedNurses));
      } catch (error) {
        console.error('Error saving connected nurses:', error);
      }
    };
    
    saveConnectedNurses();
  }, [connectedNurses]);

  const handleConnectNurse = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (upgradeRequired) {
      Alert.alert(
        'Premium Feature',
        'You need to upgrade to Premium to connect with nurses.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Subscribe Now', onPress: () => router.push('/subscription') }
        ]
      );
      return;
    }

    // Mock API call for connecting with a nurse by email
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      
      // Check if the nurse exists in our mock database
      const nurseExists = mockNurses.find(n => n.email.toLowerCase() === email.toLowerCase());
      
      if (nurseExists) {
        // Check if already connected
        const alreadyConnected = connectedNurses.some(n => n.email.toLowerCase() === email.toLowerCase());
        
        if (alreadyConnected) {
          Alert.alert('Already Connected', 'You are already connected with this nurse.');
        } else {
          // Add to connected nurses
          setConnectedNurses([...connectedNurses, nurseExists]);
          Alert.alert('Success', `Connection request sent to ${nurseExists.name}!`);
          setEmail(''); // Clear input
        }
      } else {
        Alert.alert('Not Found', 'No healthcare professional found with this email address.');
      }
    }, 1500);
  };

  const handleConnectPress = (nurse: Nurse) => {
    // Mock API call for connecting with a nurse
    Alert.alert(
      "Connect with Nurse",
      `Would you like to connect with ${nurse.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Connect",
          onPress: () => {
            // Simulating connection process
            setConnecting(true);
            setTimeout(() => {
              setConnecting(false);
              Alert.alert(
                "Connection Request Sent",
                `${nurse.name} will contact you shortly!`
              );
            }, 1500);
          },
        },
      ]
    );
  };

  const handleRemoveNurse = (nurseId: string) => {
    Alert.alert(
      'Remove Connection',
      'Are you sure you want to remove this connection?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            const updatedNurses = connectedNurses.filter(nurse => nurse.id !== nurseId);
            setConnectedNurses(updatedNurses);
          } 
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={["#00BCD4", "#0097A7"]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nurse Connect</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        <View style={styles.contentContainer}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color="#0097A7" style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Connect with nurses to share your medication schedule. They will be able to view your medication times and history.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Add a Nurse Connection</Text>
            
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={22} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter nurse's email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <TouchableOpacity 
              style={[styles.connectButton, (isLoading || connecting) && styles.disabledButton]}
              onPress={handleConnectNurse}
              disabled={isLoading || connecting}
            >
              {connecting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.connectButtonText}>Send Connection Request</Text>
              )}
            </TouchableOpacity>

            {upgradeRequired && (
              <View style={styles.premiumBanner}>
                <Ionicons name="star" size={18} color="#FFD700" />
                <Text style={styles.premiumText}>This is a premium feature</Text>
                <TouchableOpacity onPress={() => router.push('/subscription')}>
                  <Text style={styles.subscribeText}>Subscribe</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.connectionsContainer}>
            <Text style={styles.sectionTitle}>Your Connections</Text>
            
            {connectedNurses.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={50} color="#ccc" />
                <Text style={styles.emptyStateText}>No connected nurses yet</Text>
              </View>
            ) : (
              connectedNurses.map(nurse => (
                <View key={nurse.id} style={styles.nurseCard}>
                  <View style={styles.nurseAvatar}>
                    <Text style={styles.nurseInitial}>{nurse.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.nurseInfo}>
                    <Text style={styles.nurseName}>{nurse.name}</Text>
                    <Text style={styles.nurseEmail}>{nurse.email}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => handleRemoveNurse(nurse.id)}
                  >
                    <Ionicons name="close-circle" size={24} color="#f44336" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#E0F7FA',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  infoIcon: {
    marginRight: 15,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 5,
    marginBottom: 20,
  },
  inputIcon: {
    marginHorizontal: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  connectButton: {
    backgroundColor: '#0097A7',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    padding: 10,
    backgroundColor: '#FFF9C4',
    borderRadius: 10,
  },
  premiumText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  subscribeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0097A7',
    textDecorationLine: 'underline',
  },
  connectionsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  nurseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  nurseAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  nurseInitial: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0097A7',
  },
  nurseInfo: {
    flex: 1,
  },
  nurseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  nurseEmail: {
    fontSize: 14,
    color: '#666',
  },
  removeButton: {
    padding: 5,
  },
}); 