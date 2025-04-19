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
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../services/AuthContext';
import { 
  sendNurseConnectRequest, 
  getPendingNurseRequests, 
  getActiveNurseConnections,
  respondToNurseRequest,
  removeNurseConnection,
  getNurseConnectionMedications
} from '../services/SupabaseService';
import { syncSharedMedications, loadSharedMedications, scheduleSharedMedicationReminders } from '../services/NurseConnectionService';
import { useFocusEffect } from '@react-navigation/native';
import type { SharedMedication } from '../services/NurseConnectionService';
import { scheduleMedicationReminder } from '../../utils/notifications';

// Get the Medication type from local storage (we need to import the interface only)
interface Medication {
  id: string;
  name: string;
  dosage: string;
  times: string[];
  startDate: string;
  duration: string;
  color: string;
  reminderEnabled: boolean;
  currentSupply: number;
  totalSupply: number;
  refillAt: number;
  refillReminder: boolean;
  lastRefillDate?: string;
  notes?: string;
}

// Define the Nurse type
interface NurseConnection {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  profiles: {
    username: string;
    name: string;
  email: string;
  } | {
    username: string;
  name: string;
    email: string;
  }[];
  nurse_connection_medications?: {
    medication_id: string;
  }[];
}

interface PendingRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  profiles: {
    username: string;
    name: string;
    email: string;
  } | {
    username: string;
    name: string;
    email: string;
  }[];
  nurse_connection_medications?: {
    medication_id: string;
  }[];
}

export default function NurseScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // User connections state
  const [username, setUsername] = useState('');
  const [selectedMedications, setSelectedMedications] = useState<string[]>([]);
  const [myConnections, setMyConnections] = useState<NurseConnection[]>([]);
  const [nurseConnections, setNurseConnections] = useState<NurseConnection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  
  // Medications state
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationSelectorVisible, setMedicationSelectorVisible] = useState(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState('send'); // 'send', 'received', 'shared'
  const [sharedMedications, setSharedMedications] = useState<SharedMedication[]>([]);

  // Initial data load
  useEffect(() => {
    loadData();
  }, []);
  
  // Refresh when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('Nurse screen focused, refreshing data');
      loadData();
      return () => {}; // Cleanup function when screen loses focus
    }, [])
  );
  
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);
    
    try {
      // Load user's medications
      const userMeds = await AsyncStorage.getItem('@medications');
      const parsedMeds: Medication[] = userMeds ? JSON.parse(userMeds) : [];
      setMedications(parsedMeds);
      
      if (user) {
        console.log("CURRENT USER ID:", user.uid);
        
        // Load pending nurse requests first - most important
        const { data: pending, error: pendingError } = await getPendingNurseRequests(user.uid);
        console.log('Pending requests for user', user.uid, ':', pending, 'Error:', pendingError);
        
        if (pending) {
          // Ensure pending requests have the correct format
          const formattedRequests = pending.map(req => ({
            ...req,
            profiles: Array.isArray(req.profiles) && req.profiles.length > 0 
              ? req.profiles[0] 
              : req.profiles
          }));
          
          console.log('Formatted pending requests:', JSON.stringify(formattedRequests, null, 2));
          console.log('Pending requests count:', formattedRequests.length);
          setPendingRequests(formattedRequests as unknown as PendingRequest[]);
        }
        
        // Load active connections where user is sender
        const { data: sentConnections } = await getActiveNurseConnections(user.uid, false);
        if (sentConnections) {
          console.log('Sent connections:', sentConnections);
          setMyConnections(sentConnections as unknown as NurseConnection[]);
        }
        
        // Load active connections where user is the nurse
        const { data: receivedConnections } = await getActiveNurseConnections(user.uid, true);
        if (receivedConnections) {
          console.log('Received connections:', receivedConnections);
          setNurseConnections(receivedConnections as unknown as NurseConnection[]);
        }
        
        // Load shared medications for display in "Shared" tab
        const sharedMeds = await loadSharedMedications(user.uid);
        console.log('Shared medications:', sharedMeds);
        setSharedMedications(sharedMeds);
      }
    } catch (error: unknown) {
      const errorMessage = 
        error instanceof Error ? error.message : 
        typeof error === 'object' && error !== null && 'message' in error ? 
          (error as { message: string }).message : 
          String(error);
      console.error('Error loading nurse connections:', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleConnectNurse = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a valid username');
      return;
    }

    if (selectedMedications.length === 0) {
      Alert.alert('Select Medications', 'Please select at least one medication to share');
      return;
    }

    setConnecting(true);
    try {
      if (!user) {
        throw new Error('You must be logged in to connect with a nurse');
      }
      
      const { data, error } = await sendNurseConnectRequest(
        user.uid,
        username.trim(),
        selectedMedications
      );
      
      if (error) {
        const errorMessage = typeof error === 'string' ? error : error.message;
        throw new Error(errorMessage || 'Failed to send connection request');
      }
      
      Alert.alert(
        'Request Sent',
        `Connection request sent to ${username}. They will be notified to accept or reject.`
      );
      setUsername('');
      setSelectedMedications([]);
      await loadData(); // Refresh data
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send connection request');
    } finally {
      setConnecting(false);
    }
  };

  const handleRespondToRequest = async (connectionId: string, accept: boolean) => {
    setLoading(true);
    try {
      const { error } = await respondToNurseRequest(connectionId, accept);
      
      if (error) {
        const errorMessage = typeof error === 'string' ? error : error.message;
        throw new Error(errorMessage || 'Failed to respond to request');
      }
      
      if (accept && user) {
        // If the request was accepted, sync shared medications
        await syncSharedMedications(user.uid);
      }
      
    Alert.alert(
        accept ? 'Request Accepted' : 'Request Declined',
        accept 
          ? 'You will now receive medication reminders for this connection' 
          : 'Connection request has been declined'
      );
      await loadData(); // Refresh data
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to respond to request');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveConnection = async (connectionId: string, isNurse: boolean) => {
    Alert.alert(
      'Remove Connection',
      isNurse 
        ? 'Are you sure you want to stop receiving reminders for this connection?' 
        : 'Are you sure you want to remove this connection? The nurse will no longer receive your medication reminders.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await removeNurseConnection(connectionId);
              
              if (error) {
                throw new Error(error.message || 'Failed to remove connection');
              }
              
              Alert.alert('Connection Removed', 'The connection has been successfully removed');
              await loadData(); // Refresh data
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove connection');
            } finally {
              setLoading(false);
            }
          } 
        }
      ]
    );
  };
  
  const renderMedicationSelector = () => {
    return (
      <Modal
        visible={medicationSelectorVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMedicationSelectorVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Medications to Share</Text>
              <TouchableOpacity 
                onPress={() => setMedicationSelectorVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {medications.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="medkit-outline" size={50} color="#ccc" />
                <Text style={styles.emptyStateText}>No medications available</Text>
              </View>
            ) : (
              <FlatList
                data={medications}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.medicationItem}
                    onPress={() => {
                      if (selectedMedications.includes(item.id)) {
                        setSelectedMedications(selectedMedications.filter(id => id !== item.id));
                      } else {
                        setSelectedMedications([...selectedMedications, item.id]);
                      }
                    }}
                  >
                    <View style={[styles.checkbox, selectedMedications.includes(item.id) && styles.checkboxChecked]}>
                      {selectedMedications.includes(item.id) && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                    <View style={styles.medicationInfo}>
                      <Text style={styles.medicationName}>{item.name}</Text>
                      <Text style={styles.medicationDosage}>{item.dosage}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
            
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={() => setMedicationSelectorVisible(false)}
            >
              <Text style={styles.confirmButtonText}>
                Confirm Selection ({selectedMedications.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Helper function to safely get profile data
  const getProfileData = (request: any): { name: string; username: string; initial: string } => {
    // Add debug log
    console.log("Processing profile data:", request);
    
    // Handle different profile data structures
    const profile = request.profiles;
    
    if (!profile) {
      console.warn("No profile data found for request:", request.id);
      return { name: 'Unknown', username: 'unknown', initial: '?' };
    }
    
    // Profile might be an array or a direct object
    let profileData;
    
    if (Array.isArray(profile)) {
      profileData = profile.length > 0 ? profile[0] : null;
    } else if (typeof profile === 'object') {
      profileData = profile;
    } else {
      console.warn("Unexpected profile data format:", profile);
      profileData = null;
    }
    
    if (!profileData) {
      return { name: 'Unknown', username: 'unknown', initial: '?' };
    }
    
    // Extract data with fallbacks
    const name = profileData.name || profileData.username || 'Unknown';
    const username = profileData.username || 'unknown';
    const initial = name.charAt(0).toUpperCase();
    
    console.log("Extracted profile data:", { name, username, initial });
    
    return { name, username, initial };
  };

  // Helper function to fetch medication names by IDs
  const getMedicationNames = (medicationIds: string[]) => {
    if (!medicationIds || medicationIds.length === 0) return 'No medications';
    
    const medNames = medicationIds.map(id => {
      const med = medications.find(m => m.id === id);
      return med ? med.name : 'Unknown';
    }).filter(name => name !== 'Unknown');
    
    if (medNames.length === 0) return 'No medications';
    if (medNames.length === 1) return medNames[0];
    if (medNames.length === 2) return `${medNames[0]} and ${medNames[1]}`;
    return `${medNames.length} medications`;
  };

  const toggleMedicationReminder = async (medication: SharedMedication) => {
    try {
      console.log('Toggling reminder for medication:', medication);
      
      // Toggle the reminderEnabled property
      const updatedMedication = {
        ...medication,
        reminderEnabled: !medication.reminderEnabled
      };
      
      // Get all medications
      const allMeds = await AsyncStorage.getItem('@medications');
      let medications = allMeds ? JSON.parse(allMeds) : [];
      
      console.log('Found medications in storage:', medications.length);
      
      // Find and update the specific medication
      const index = medications.findIndex((m: any) => 
        m.id === medication.id && 
        (m.isShared === true || m.isShared === undefined)
      );
      
      console.log('Found medication at index:', index);
      
      if (index !== -1) {
        medications[index] = updatedMedication;
        
        // Save back to storage
        await AsyncStorage.setItem('@medications', JSON.stringify(medications));
        console.log('Saved updated medications to storage');
        
        // Update the state immediately for UI response
        const updatedSharedMeds = [...sharedMedications];
        const sharedIndex = updatedSharedMeds.findIndex(m => m.id === medication.id);
        if (sharedIndex !== -1) {
          updatedSharedMeds[sharedIndex] = updatedMedication;
          setSharedMedications(updatedSharedMeds);
          console.log('Updated shared medications state');
        }
        
        // Handle reminders based on new setting
        if (updatedMedication.reminderEnabled) {
          console.log('Enabling reminder for medication');
          await scheduleMedicationReminder({
            ...updatedMedication,
            name: `${updatedMedication.name} (${updatedMedication.sharedByName})`
          });
        } else {
          console.log('Reminder disabled - would cancel here if needed');
          // You could add code to cancel notifications here if you implement that feature
        }
        
        Alert.alert(
          'Reminder Updated',
          `Reminders ${updatedMedication.reminderEnabled ? 'enabled' : 'disabled'} for ${medication.name}`
        );
      } else {
        console.log('Could not find medication in storage, adding it');
        
        // Add the medication if it doesn't exist
        medications.push(updatedMedication);
        await AsyncStorage.setItem('@medications', JSON.stringify(medications));
        
        // Update shared medications state
        setSharedMedications([...sharedMedications, updatedMedication]);
        
        if (updatedMedication.reminderEnabled) {
          await scheduleMedicationReminder({
            ...updatedMedication,
            name: `${updatedMedication.name} (${updatedMedication.sharedByName})`
          });
        }
        
        Alert.alert(
          'Medication Added',
          `${medication.name} has been added to your medications with reminders ${updatedMedication.reminderEnabled ? 'enabled' : 'disabled'}`
        );
      }
    } catch (error) {
      console.error('Error toggling reminder:', error);
      Alert.alert('Error', 'Failed to update reminder settings. Please try again.');
    }
  };

  const forceRefreshSharedMedications = async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      // Clear and reload shared medications
      console.log('Force refreshing shared medications');
      
      // Sync medications
      await syncSharedMedications(user.uid);
      
      // Re-load medications after sync
      const sharedMeds = await loadSharedMedications(user.uid);
      console.log('Reloaded shared medications:', sharedMeds);
      setSharedMedications(sharedMeds);
      
      Alert.alert('Refresh Complete', 'Shared medications have been refreshed');
    } catch (error) {
      console.error('Error refreshing shared medications:', error);
      Alert.alert('Refresh Failed', 'Failed to refresh shared medications. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0097A7" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'send':
        return (
          <View style={styles.tabContent}>
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>Add a Nurse Connection</Text>
              
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={22} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter username to connect with"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity 
                style={styles.selectMedicationsButton}
                onPress={() => setMedicationSelectorVisible(true)}
              >
                <Ionicons name="medkit-outline" size={22} color="#0097A7" style={styles.buttonIcon} />
                <Text style={styles.selectMedicationsText}>
                  {selectedMedications.length === 0 
                    ? "Select Medications to Share" 
                    : `Selected ${selectedMedications.length} medication(s)`}
                </Text>
                <Ionicons name="chevron-forward" size={22} color="#0097A7" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.connectButton, (connecting || selectedMedications.length === 0) && styles.disabledButton]}
                onPress={handleConnectNurse}
                disabled={connecting || selectedMedications.length === 0}
              >
                {connecting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.connectButtonText}>Send Connection Request</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.connectionsContainer}>
              <Text style={styles.sectionTitle}>Your Active Connections</Text>
              
              {myConnections.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={50} color="#ccc" />
                  <Text style={styles.emptyStateText}>No active connections</Text>
                </View>
              ) : (
                myConnections.map(connection => {
                  const profile = getProfileData(connection);
                  
                  return (
                    <View key={connection.id} style={styles.connectionCard}>
                      <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>{profile.initial}</Text>
                      </View>
                      <View style={styles.connectionInfo}>
                        <Text style={styles.connectionName}>{profile.name}</Text>
                        <Text style={styles.connectionDetail}>@{profile.username}</Text>
                        <Text style={styles.connectionDetail}>
                          {connection.nurse_connection_medications?.length || 0} medications shared
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => handleRemoveConnection(connection.id, false)}
                      >
                        <Ionicons name="close-circle" size={24} color="#f44336" />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        );
        
      case 'received':
        return (
          <View style={styles.tabContent}>
            <View style={styles.connectionsContainer}>
              <View style={styles.sectionHeaderWithAction}>
                <Text style={styles.sectionTitle}>Pending Requests</Text>
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={() => {
                    console.log('Manual refresh of pending requests triggered');
                    loadData();
                  }}
                  disabled={isLoading || refreshing}
                >
                  {refreshing ? (
                    <ActivityIndicator size="small" color="#0097A7" />
                  ) : (
                    <View style={styles.refreshButtonContent}>
                      <Ionicons name="refresh-outline" size={16} color="#0097A7" />
                      <Text style={styles.refreshButtonText}>Refresh</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              
              {pendingRequests.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="notifications-outline" size={50} color="#ccc" />
                  <Text style={styles.emptyStateText}>No pending requests</Text>
                </View>
              ) : (
                pendingRequests.map(request => {
                  const profile = getProfileData(request);
                  const medicationIds = request.nurse_connection_medications?.map(m => m.medication_id) || [];
                  
                  return (
                    <View key={request.id} style={styles.requestCard}>
                      <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>{profile.initial}</Text>
                      </View>
                      <View style={styles.connectionInfo}>
                        <Text style={styles.connectionName}>{profile.name}</Text>
                        <Text style={styles.connectionDetail}>@{profile.username}</Text>
                        <Text style={styles.connectionDetail}>
                          Sent on {new Date(request.created_at).toLocaleDateString()}
                        </Text>
                        <Text style={[styles.connectionDetail, styles.medicationInfoText]}>
                          <Ionicons name="medkit-outline" size={14} color="#0097A7" /> {" "}
                          {getMedicationNames(medicationIds)}
                        </Text>
                      </View>
                      <View style={styles.requestActions}>
                        <TouchableOpacity 
                          style={styles.acceptButton}
                          onPress={() => handleRespondToRequest(request.id, true)}
                        >
                          <Ionicons name="checkmark" size={24} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.rejectButton}
                          onPress={() => handleRespondToRequest(request.id, false)}
                        >
                          <Ionicons name="close" size={24} color="white" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
            
            <View style={styles.connectionsContainer}>
              <Text style={styles.sectionTitle}>Active as Nurse</Text>
              
              {nurseConnections.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={50} color="#ccc" />
                  <Text style={styles.emptyStateText}>No active connections as nurse</Text>
                </View>
              ) : (
                nurseConnections.map(connection => {
                  const profile = getProfileData(connection);
                  
                  return (
                    <View key={connection.id} style={styles.connectionCard}>
                      <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>{profile.initial}</Text>
                      </View>
                      <View style={styles.connectionInfo}>
                        <Text style={styles.connectionName}>{profile.name}</Text>
                        <Text style={styles.connectionDetail}>@{profile.username}</Text>
                        <Text style={styles.connectionDetail}>
                          {connection.nurse_connection_medications?.length || 0} medications shared
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => handleRemoveConnection(connection.id, true)}
                      >
                        <Ionicons name="close-circle" size={24} color="#f44336" />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        );
        
      case 'shared':
        return (
          <View style={styles.tabContent}>
            <View style={styles.connectionsContainer}>
              <View style={styles.sectionHeaderWithAction}>
                <Text style={styles.sectionTitle}>Shared Medications</Text>
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={() => {
                    console.log('Manual refresh of shared medications triggered');
                    forceRefreshSharedMedications();
                  }}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <ActivityIndicator size="small" color="#0097A7" />
                  ) : (
                    <View style={styles.refreshButtonContent}>
                      <Ionicons name="refresh-outline" size={16} color="#0097A7" />
                      <Text style={styles.refreshButtonText}>Refresh</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              
              {sharedMedications.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="medkit-outline" size={50} color="#ccc" />
                  <Text style={styles.emptyStateText}>No shared medications</Text>
                </View>
              ) : (
                sharedMedications.map(medication => (
                  <View key={medication.id} style={styles.medicationCard}>
                    <View style={[styles.medicationColorIndicator, { backgroundColor: medication.color || '#4CAF50' }]} />
                    <View style={styles.medicationInfo}>
                      <Text style={styles.medicationName}>
                        {medication.name} 
                        <Text style={styles.medicationSharedBy}> (from {medication.sharedByName || 'Unknown'})</Text>
                      </Text>
                      <Text style={styles.medicationDetail}>{medication.dosage || 'No dosage info'}</Text>
                      <Text style={styles.medicationDetail}>
                        {medication.times && medication.times.length > 0 
                          ? medication.times.join(', ') 
                          : 'No schedule info'}
                      </Text>
                      <Text style={styles.medicationDetail}>
                        <Text style={styles.medicationId}>ID: {medication.id.substring(0, 8)}...</Text>
                      </Text>
                    </View>
                    <View style={styles.reminderToggle}>
                      <Text style={styles.reminderText}>Reminders</Text>
                      <Switch
                        value={medication.reminderEnabled}
                        onValueChange={() => toggleMedicationReminder(medication)}
                        trackColor={{ false: '#d1d1d1', true: '#81c784' }}
                        thumbColor={medication.reminderEnabled ? '#4CAF50' : '#f4f3f4'}
                      />
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        );
        
      default:
        return null;
    }
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

      {!user ? (
        <View style={styles.signInContainer}>
          <Ionicons name="person-circle-outline" size={60} color="#00BCD4" style={styles.signInIcon} />
          <Text style={styles.signInTitle}>Sign In Required</Text>
          <Text style={styles.signInText}>
            You need to sign in to use the Nurse Connect feature.
            Sign in to share medications and receive reminders.
            </Text>
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
          </View>
      ) : (
        <>
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'send' && styles.activeTab]}
              onPress={() => setActiveTab('send')}
            >
              <Text style={[styles.tabText, activeTab === 'send' && styles.activeTabText]}>
                Send
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'received' && styles.activeTab]}
              onPress={() => setActiveTab('received')}
            >
              <View style={styles.tabBadgeContainer}>
                <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
                  Received
                </Text>
                {pendingRequests.length > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{pendingRequests.length}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'shared' && styles.activeTab]}
              onPress={() => setActiveTab('shared')}
            >
              <View style={styles.tabBadgeContainer}>
                <Text style={[styles.tabText, activeTab === 'shared' && styles.activeTabText]}>
                  Shared
                </Text>
                {sharedMedications.length > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{sharedMedications.length}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView}>
            <View style={styles.contentContainer}>
              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={24} color="#0097A7" style={styles.infoIcon} />
                <Text style={styles.infoText}>
                  Connect with other users to share your medication schedule. They will be able to view your medication times and receive reminders.
                </Text>
              </View>

              {renderTabContent()}
        </View>
      </ScrollView>

          {renderMedicationSelector()}
        </>
      )}
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#00BCD4',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#00BCD4',
    fontWeight: '600',
  },
  tabBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeContainer: {
    marginLeft: 8,
    backgroundColor: '#f44336',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
  tabContent: {
    flex: 1,
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
  selectMedicationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  buttonIcon: {
    marginRight: 10,
  },
  selectMedicationsText: {
    flex: 1,
    fontSize: 16,
    color: '#0097A7',
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
  connectionsContainer: {
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
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0097A7',
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  connectionDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  removeButton: {
    padding: 5,
  },
  requestActions: {
    flexDirection: 'row',
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f44336',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  medicationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0097A7',
    marginRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0097A7',
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: '#666',
  },
  confirmButton: {
    backgroundColor: '#0097A7',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  signInContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  signInIcon: {
    marginBottom: 20,
  },
  signInTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  signInText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  signInButton: {
    backgroundColor: '#00BCD4',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  signInButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refreshButton: {
    padding: 5,
  },
  refreshButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#0097A7',
    fontSize: 16,
    fontWeight: '600',
  },
  medicationInfoText: {
    color: '#0097A7',
    fontStyle: 'italic',
  },
  medicationCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medicationColorIndicator: {
    width: 8,
    height: '100%',
    borderRadius: 4,
    marginRight: 12,
  },
  medicationSharedBy: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
    fontStyle: 'italic',
  },
  reminderToggle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  medicationId: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
}); 