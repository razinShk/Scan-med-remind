import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, ActivityIndicator, View, Text } from "react-native";
import { AuthProvider } from "./services/AuthContext";
import { SubscriptionProvider } from "./services/SubscriptionContext";
import { useEffect, useState } from 'react';
import { initializeRevenueCat } from './services/RevenueCatService';
import { useFonts } from 'expo-font';

// Wrap the app with our providers
export default function Layout() {
  // Load any fonts if needed
  const [fontsLoaded] = useFonts({
    // Add fonts here if required, or leave empty
  });
  
  const [rcInitialized, setRcInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize RevenueCat
    const setupRevenueCat = async () => {
      try {
        await initializeRevenueCat();
        setRcInitialized(true);
      } catch (error) {
        console.error('Failed to initialize RevenueCat:', error);
        setInitError(error instanceof Error ? error.message : 'Failed to initialize premium features');
        // Set initialized to true anyway to allow the app to continue
        setRcInitialized(true);
      }
    };
    
    setupRevenueCat();
  }, []);

  // Show a loading indicator while initializing
  if (!rcInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <>
          <StatusBar style="light" />
          {initError && (
            <View style={{ 
              backgroundColor: '#FFF3CD', 
              padding: 8, 
              alignItems: 'center',
              borderBottomWidth: 1,
              borderBottomColor: '#FFE69C' 
            }}>
              <Text style={{ color: '#856404' }}>
                Premium features may be limited: {initError}
              </Text>
            </View>
          )}
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "white" },
              animation: "slide_from_right",
              header: () => null,
              navigationBarHidden: true,
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="home"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="scan"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="auth"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="medications/add"
              options={{
                headerShown: false,
                headerBackTitle: "",
                title: "",
              }}
            />
            <Stack.Screen
              name="medications/edit"
              options={{
                headerShown: false,
                headerBackTitle: "",
                title: "",
              }}
            />
            <Stack.Screen
              name="refills/index"
              options={{
                headerShown: false,
                headerBackTitle: "",
                title: "",
              }}
            />
            <Stack.Screen
              name="calendar/index"
              options={{
                headerShown: false,
                headerBackTitle: "",
                title: "",
              }}
            />
            <Stack.Screen
              name="history/index"
              options={{
                headerShown: false,
                headerBackTitle: "",
                title: "",
              }}
            />
            <Stack.Screen
              name="test"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="subscription/index"
              options={{
                headerShown: false,
                headerBackTitle: "",
                title: "",
              }}
            />
            <Stack.Screen
              name="nurse/index"
              options={{
                headerShown: false,
                headerBackTitle: "",
                title: "",
              }}
            />
            <Stack.Screen
              name="profile/index"
              options={{
                headerShown: false,
                headerBackTitle: "",
                title: "",
              }}
            />
          </Stack>
        </>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
