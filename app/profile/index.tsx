import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../services/AuthContext';
import { getMedications, Medication } from '../../utils/storage';

// Meal timing type definition
interface MealTiming {
  id: string;
  name: string;
  time: string;
  enabled: boolean;
}

// Default meal timings
const defaultMealTimings: MealTiming[] = [
  { id: '1', name: 'Breakfast', time: '08:00', enabled: true },
  { id: '2', name: 'Lunch', time: '13:00', enabled: true },
  { id: '3', name: 'Dinner', time: '19:00', enabled: true },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isSubscribed, signOut, updateProfile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [mealTimings, setMealTimings] = useState<MealTiming[]>(defaultMealTimings);
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [savingName, setSavingName] = useState(false);
  
  // Load user data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load medications
        const meds = await getMedications();
        setMedications(meds);
        
        // Load saved meal timings
        const savedMealTimings = await AsyncStorage.getItem('mealTimings');
        if (savedMealTimings) {
          setMealTimings(JSON.parse(savedMealTimings));
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Save meal timings when changed
  useEffect(() => {
    const saveMealTimings = async () => {
      try {
        await AsyncStorage.setItem('mealTimings', JSON.stringify(mealTimings));
      } catch (error) {
        console.error('Error saving meal timings:', error);
      }
    };
    
    saveMealTimings();
  }, [mealTimings]);
  
  // Handle meal timing toggle
  const toggleMealTiming = (id: string) => {
    setMealTimings(mealTimings.map(meal => 
      meal.id === id ? { ...meal, enabled: !meal.enabled } : meal
    ));
  };
  
  // Handle meal timing time change
  const updateMealTime = (id: string, time: string) => {
    setMealTimings(mealTimings.map(meal => 
      meal.id === id ? { ...meal, time } : meal
    ));
  };
  
  // Handle profile name update
  const handleUpdateName = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    
    setSavingName(true);
    try {
      await updateProfile({ displayName: displayName.trim() });
      setEditingName(false);
    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert('Error', 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };
  
  // Format time to 12-hour format
  const formatTime = (time24: string): string => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };
  
  // Sign out function
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut }
      ]
    );
  };
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1976D2", "#0D47A1"]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>
      </LinearGradient>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            
            {editingName ? (
              <View style={styles.nameEditContainer}>
                <TextInput
                  style={styles.nameInput}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Enter your name"
                  autoFocus
                />
                <View style={styles.nameEditButtons}>
                  <TouchableOpacity 
                    style={styles.nameEditButton}
                    onPress={() => setEditingName(false)}
                  >
                    <Ionicons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.nameEditButton}
                    onPress={handleUpdateName}
                    disabled={savingName}
                  >
                    {savingName ? (
                      <ActivityIndicator size="small" color="#1976D2" />
                    ) : (
                      <Ionicons name="checkmark" size={20} color="#1976D2" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.nameContainer}>
                <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
                <TouchableOpacity onPress={() => setEditingName(true)}>
                  <Ionicons name="create-outline" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            )}
            
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{medications.length}</Text>
              <Text style={styles.statLabel}>Medications</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{mealTimings.filter(m => m.enabled).length}</Text>
              <Text style={styles.statLabel}>Meal Reminders</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Subscription Status</Text>
          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionContent}>
              <View style={styles.subscriptionIcon}>
                <Ionicons 
                  name={isSubscribed ? "checkmark-circle" : "alert-circle"} 
                  size={32} 
                  color={isSubscribed ? "#4CAF50" : "#FFC107"} 
                />
              </View>
              <View style={styles.subscriptionInfo}>
                <Text style={styles.subscriptionTitle}>
                  {isSubscribed ? "Premium Active" : "Free Plan"}
                </Text>
                <Text style={styles.subscriptionDesc}>
                  {isSubscribed 
                    ? "You have access to all premium features" 
                    : "Upgrade to unlock premium features"}
                </Text>
              </View>
            </View>
            
            {!isSubscribed && (
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={() => router.push('/subscription/index' as any)}
              >
                <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Meal Timings</Text>
          <View style={styles.mealTimingsContainer}>
            {mealTimings.map((meal) => (
              <View key={meal.id} style={styles.mealItem}>
                <View style={styles.mealInfo}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealTime}>{formatTime(meal.time)}</Text>
                </View>
                <Switch
                  value={meal.enabled}
                  onValueChange={() => toggleMealTiming(meal.id)}
                  trackColor={{ false: '#ddd', true: '#bbdefb' }}
                  thumbColor={meal.enabled ? '#1976D2' : '#f4f3f4'}
                />
              </View>
            ))}
          </View>
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account Options</Text>
          <View style={styles.accountOptions}>
            <TouchableOpacity 
              style={styles.accountOption}
              onPress={() => router.push('/nurse/index' as any)}
            >
              <Ionicons name="people-outline" size={22} color="#1976D2" style={styles.accountOptionIcon} />
              <Text style={styles.accountOptionText}>Nurse Connect</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
            
            {isSubscribed && (
              <TouchableOpacity 
                style={styles.accountOption}
                onPress={() => router.push('/subscription/index' as any)}
              >
                <Ionicons name="card-outline" size={22} color="#1976D2" style={styles.accountOptionIcon} />
                <Text style={styles.accountOptionText}>Manage Subscription</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.accountOption}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={22} color="#F44336" style={styles.accountOptionIcon} />
              <Text style={[styles.accountOptionText, { color: '#F44336' }]}>Sign Out</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
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
  profileSection: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  nameEditContainer: {
    width: '80%',
    marginBottom: 10,
  },
  nameInput: {
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    marginBottom: 5,
  },
  nameEditButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  nameEditButton: {
    padding: 5,
    marginLeft: 10,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  sectionContainer: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    paddingLeft: 5,
  },
  subscriptionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  subscriptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionIcon: {
    marginRight: 15,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  subscriptionDesc: {
    fontSize: 14,
    color: '#666',
  },
  upgradeButton: {
    backgroundColor: '#1976D2',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  mealTimingsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 3,
  },
  mealTime: {
    fontSize: 14,
    color: '#666',
  },
  accountOptions: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  accountOptionIcon: {
    marginRight: 15,
  },
  accountOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
}); 