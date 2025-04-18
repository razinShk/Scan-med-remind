import { View, Text, StyleSheet, Animated, Alert, Platform, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { configureNotifications } from "../utils/notifications";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useAuth } from "./services/AuthContext";

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  async function requestNotificationPermissions() {
    try {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        // Only ask if permissions have not already been determined
        if (existingStatus !== 'granted') {
          // Request permission
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        // If we still don't have permission, alert the user
        if (finalStatus !== 'granted') {
          Alert.alert(
            'Notification Permission Required',
            'Please enable notifications in your device settings to receive medication reminders.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // Set up notification handler
        configureNotifications();
        
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Medication Reminders',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#1a8e2d',
          });
        }
      } else {
        console.warn('Physical device required for notifications');
      }
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  }

  useEffect(() => {
    // Request notification permissions
    requestNotificationPermissions();
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 10,
        friction: 2,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      try {
        // Navigate to home screen, no login required
        router.replace("/home");
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback to home screen on error
        router.replace("/home");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image 
          source={require('../assets/NoBgLogoMed.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>MedRemind</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 0,
  },
  appName: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 20,
    letterSpacing: 1,
  },
});
