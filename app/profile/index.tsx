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
import { ROUTES } from '../services/NavigationHelper';
import DateTimePicker from '@react-native-community/datetimepicker';

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

interface MealTimes {
  breakfast: string;
  lunch: string;
  eveningSnacks: string;
  dinner: string;
}

// First, add a getSubscriptionPlanName function to display plan type
const getSubscriptionPlanName = (user: any) => {
  if (!user?.isSubscribed) return "Free Plan";
  // In a real app, this would come from user data or subscription context
  // For now we're just showing a placeholder
  return "Premium Plan (Monthly)"; // Or "Premium Plan (Yearly)"
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isSubscribed, signOut, updateProfile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [mealTimings, setMealTimings] = useState<MealTiming[]>(defaultMealTimings);
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [savingName, setSavingName] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [showMealTimePicker, setShowMealTimePicker] = useState(false);
  const [currentMeal, setCurrentMeal] = useState<keyof MealTimes>('breakfast');
  const [mealTimes, setMealTimes] = useState<MealTimes>({
    breakfast: '09:00',
    lunch: '13:00',
    eveningSnacks: '17:00',
    dinner: '20:00',
  });
  
  // Add section order management
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  
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

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('@userSettings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        setNotificationsEnabled(parsedSettings.notifications ?? true);
        setSoundEnabled(parsedSettings.sound ?? true);
        setVibrationEnabled(parsedSettings.vibration ?? true);
      }

      // Log to verify loading
      console.log('Loading meal times from storage...');
      const savedMealTimes = await AsyncStorage.getItem('@mealTimes');
      if (savedMealTimes) {
        console.log('Found saved meal times:', savedMealTimes);
        setMealTimes(JSON.parse(savedMealTimes));
      } else {
        console.log('No saved meal times found, using defaults');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleMealTimeChange = async (event: any, selectedTime: Date | undefined) => {
    setShowMealTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      const newMealTimes = {
        ...mealTimes,
        [currentMeal]: timeString
      };
      
      setMealTimes(newMealTimes);
      
      Alert.alert('Time Updated', `${currentMeal} time updated to ${formatTime(timeString)}. Press the Save button to save changes.`);
    }
  };

  const showTimePicker = (meal: keyof MealTimes) => {
    setCurrentMeal(meal);
    setShowMealTimePicker(true);
  };

  const saveSettings = async () => {
    try {
      const settings = {
        notifications: notificationsEnabled,
        sound: soundEnabled,
        vibration: vibrationEnabled,
      };
      
      console.log('Saving user settings:', JSON.stringify(settings));
      await AsyncStorage.setItem('@userSettings', JSON.stringify(settings));
      
      console.log('Saving meal times:', JSON.stringify(mealTimes));
      await AsyncStorage.setItem('@mealTimes', JSON.stringify(mealTimes));
      
      Alert.alert('Success', 'All settings saved successfully. Your meal times will now be used for medication scheduling.');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  // Update subscription handling
  const handleUpgradeClick = () => {
    router.push('/subscription');
  };

  // Handle nurse connect navigation
  const handleNurseConnect = () => {
    router.push('/nurse');
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
        {!user ? (
          <View style={styles.signInContainer}>
            <Ionicons name="person-circle-outline" size={60} color="#1976D2" style={styles.signInIcon} />
            <Text style={styles.signInTitle}>Sign In Required</Text>
            <Text style={styles.signInText}>
              Sign in to access your profile, sync your medications across devices,
              and share with caregivers.
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
                
                <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
                
                {isSubscribed && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.premiumText}>Premium</Text>
                  </View>
                )}
              </View>
              
              {/* Menu items */}
              <View style={styles.menuSection}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => router.push('/subscription')}
                >
                  <View style={styles.menuIconContainer}>
                    <Ionicons name="star-outline" size={22} color="#1976D2" />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>
                      {isSubscribed ? 'Manage Subscription' : 'Get Premium'}
                    </Text>
                    <Text style={styles.menuSubtitle}>
                      {isSubscribed ? 'View your premium benefits' : 'Unlock all features'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => router.push('/nurse')}
                >
                  <View style={styles.menuIconContainer}>
                    <Ionicons name="people-outline" size={22} color="#1976D2" />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>Nurse Connect</Text>
                    <Text style={styles.menuSubtitle}>Share medications with caregivers</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
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
                      {isSubscribed ? getSubscriptionPlanName(user) : "Free Plan"}
                    </Text>
                    <Text style={styles.subscriptionDesc}>
                      {isSubscribed 
                        ? "You have access to all premium features" 
                        : "Upgrade to unlock premium features"}
                    </Text>
                  </View>
                </View>
                
                {!isSubscribed ? (
                  <TouchableOpacity 
                    style={styles.upgradeButton}
                    onPress={handleUpgradeClick}
                  >
                    <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.upgradeButton, { backgroundColor: '#E0F2F1' }]}
                    onPress={handleUpgradeClick}
                  >
                    <Text style={[styles.upgradeButtonText, { color: '#00796B' }]}>Manage Subscription</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Meal Settings</Text>
                <TouchableOpacity 
                  style={styles.saveSettingsButton}
                  onPress={saveSettings}
                >
                  <Text style={styles.saveSettingsButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.mealTimingsCard}>
                <View style={styles.mealSettingItem}>
                  <View style={styles.mealInfoContainer}>
                    <Ionicons name="sunny-outline" size={22} color="#FF9800" style={styles.mealIcon} />
                    <View style={styles.mealTextContainer}>
                      <Text style={styles.mealName}>Breakfast</Text>
                      <Text style={styles.mealTimeInfo}>{formatTime(mealTimes.breakfast)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.timeSelector}
                    onPress={() => showTimePicker('breakfast')}
                  >
                    <Ionicons name="time-outline" size={20} color="#1976D2" />
                  </TouchableOpacity>
                </View>

                <View style={styles.mealSettingItem}>
                  <View style={styles.mealInfoContainer}>
                    <Ionicons name="restaurant-outline" size={22} color="#4CAF50" style={styles.mealIcon} />
                    <View style={styles.mealTextContainer}>
                      <Text style={styles.mealName}>Lunch</Text>
                      <Text style={styles.mealTimeInfo}>{formatTime(mealTimes.lunch)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.timeSelector}
                    onPress={() => showTimePicker('lunch')}
                  >
                    <Ionicons name="time-outline" size={20} color="#1976D2" />
                  </TouchableOpacity>
                </View>

                <View style={styles.mealSettingItem}>
                  <View style={styles.mealInfoContainer}>
                    <Ionicons name="cafe-outline" size={22} color="#795548" style={styles.mealIcon} />
                    <View style={styles.mealTextContainer}>
                      <Text style={styles.mealName}>Evening Snacks</Text>
                      <Text style={styles.mealTimeInfo}>{formatTime(mealTimes.eveningSnacks)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.timeSelector}
                    onPress={() => showTimePicker('eveningSnacks')}
                  >
                    <Ionicons name="time-outline" size={20} color="#1976D2" />
                  </TouchableOpacity>
                </View>

                <View style={styles.mealSettingItem}>
                  <View style={styles.mealInfoContainer}>
                    <Ionicons name="moon-outline" size={22} color="#673AB7" style={styles.mealIcon} />
                    <View style={styles.mealTextContainer}>
                      <Text style={styles.mealName}>Dinner</Text>
                      <Text style={styles.mealTimeInfo}>{formatTime(mealTimes.dinner)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.timeSelector}
                    onPress={() => showTimePicker('dinner')}
                  >
                    <Ionicons name="time-outline" size={20} color="#1976D2" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.mealSettingNote}>
                  These meal times will be used for scheduling your medication reminders.
                </Text>
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Notification Settings</Text>
                <TouchableOpacity 
                  style={styles.toggleButton}
                  onPress={() => setShowNotificationSettings(!showNotificationSettings)}
                >
                  <Ionicons 
                    name={showNotificationSettings ? "chevron-up" : "chevron-down"} 
                    size={22} 
                    color="#1976D2" 
                  />
                </TouchableOpacity>
              </View>
              
              <View style={styles.notificationCard}>
                <View style={styles.notificationMain}>
                  <View style={styles.notificationIconContainer}>
                    <Ionicons name="notifications" size={24} color="#1976D2" />
                  </View>
                  <View style={styles.notificationTextContainer}>
                    <Text style={styles.notificationTitle}>Medication Reminders</Text>
                    <Text style={styles.notificationSubtitle}>
                      Receive alerts for your medications
                    </Text>
                  </View>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: '#d1d1d1', true: '#81c784' }}
                    thumbColor={notificationsEnabled ? '#4CAF50' : '#f4f3f4'}
                  />
                </View>
                
                {showNotificationSettings && (
                  <View style={styles.notificationDetails}>
                    <View style={styles.notificationOption}>
                      <Text style={styles.notificationOptionText}>Sound</Text>
                      <Switch
                        value={soundEnabled}
                        onValueChange={setSoundEnabled}
                        trackColor={{ false: '#d1d1d1', true: '#81c784' }}
                        thumbColor={soundEnabled ? '#4CAF50' : '#f4f3f4'}
                        disabled={!notificationsEnabled}
                      />
                    </View>
                    
                    <View style={styles.notificationOption}>
                      <Text style={styles.notificationOptionText}>Vibration</Text>
                      <Switch
                        value={vibrationEnabled}
                        onValueChange={setVibrationEnabled}
                        trackColor={{ false: '#d1d1d1', true: '#81c784' }}
                        thumbColor={vibrationEnabled ? '#4CAF50' : '#f4f3f4'}
                        disabled={!notificationsEnabled}
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Account Options</Text>
              <View style={styles.accountOptions}>
                <TouchableOpacity 
                  style={styles.accountOption}
                  onPress={handleNurseConnect}
                >
                  <Ionicons name="people-outline" size={22} color="#1976D2" style={styles.accountOptionIcon} />
                  <Text style={styles.accountOptionText}>Nurse Connect</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
                
                {isSubscribed && (
                  <TouchableOpacity 
                    style={styles.accountOption}
                    onPress={handleUpgradeClick}
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
          </>
        )}
      </ScrollView>

      {showMealTimePicker && (
        <DateTimePicker
          value={(() => {
            const [hours, minutes] = mealTimes[currentMeal].split(':');
            const date = new Date();
            date.setHours(parseInt(hours, 10));
            date.setMinutes(parseInt(minutes, 10));
            return date;
          })()}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleMealTimeChange}
        />
      )}
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
  mealTimingsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    padding: 5,
  },
  mealSettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mealInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mealIcon: {
    marginRight: 15,
  },
  mealTextContainer: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  mealTimeInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
  timeSelector: {
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
  },
  mealSettingNote: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
    padding: 15,
    textAlign: 'center',
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
  signInContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 50,
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
    backgroundColor: '#1976D2',
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
  premiumBadge: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    padding: 5,
    marginTop: 10,
  },
  premiumText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  menuSection: {
    marginTop: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuIconContainer: {
    marginRight: 15,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  saveSettingsButton: {
    backgroundColor: '#0097A7',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  saveSettingsButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  notificationCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginVertical: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  notificationMain: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  notificationSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  notificationDetails: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 15,
  },
  notificationOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  notificationOptionText: {
    fontSize: 15,
    color: "#444",
  },
  toggleButton: {
    padding: 8,
  },
}); 