import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  signInWithEmail, 
  signUpWithEmail, 
  signOut as supabaseSignOut,
  resetPassword as supabaseResetPassword,
  updateUserProfile,
  supabase
} from './SupabaseService';
import { 
  identifyUser, 
  resetUser, 
  checkSubscriptionStatus 
} from './RevenueCatService';
import { Alert } from 'react-native';

// Define user interface
interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  username: string | null;
  photoURL: string | null;
  referralCode?: string;
  isSubscribed?: boolean;
}

// Create a default user for development mode only
const DEFAULT_USER: User = {
  uid: 'default-user-id',
  email: 'user@example.com',
  displayName: 'Demo User',
  photoURL: 'https://via.placeholder.com/150',
  referralCode: 'DEMO123',
  isSubscribed: true,
};

// Auth context interface
interface AuthContextProps {
  user: User | null;
  loading: boolean;
  isSubscribed: boolean;
  signUp: (email: string, password: string, name: string, username: string, referralCode?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshSubscriptionStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Initialize auth state
  useEffect(() => {
    // Check if the user is already signed in
    const loadUser = async () => {
      try {
        setLoading(true);
        
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Get user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          const userData: User = {
            uid: session.user.id,
            email: session.user.email,
            displayName: profile?.name || session.user.email?.split('@')[0] || null,
            photoURL: profile?.avatar_url || null,
            referralCode: profile?.referral_code || generateReferralCode(),
          };
          
          setUser(userData);
          
          // Identify user with RevenueCat
          await identifyUser(userData.uid);
          
          // Check subscription status
          await refreshSubscriptionStatus();
        }
      } catch (error) {
        console.error('Error loading user:', error);
        // For development only - use default user
        if (__DEV__) {
          setUser(DEFAULT_USER);
          setIsSubscribed(true);
        }
      } finally {
        setLoading(false);
      }
    };

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (profileError) {
            console.error('Error fetching profile:', profileError);
          }

          const userData: User = {
            uid: session.user.id,
            email: session.user.email,
            displayName: profile?.name || session.user.email?.split('@')[0] || null,
            photoURL: profile?.avatar_url || null,
            referralCode: profile?.referral_code || generateReferralCode(),
          };
          
          setUser(userData);
          
          // Identify user with RevenueCat
          try {
            await identifyUser(userData.uid);
            // Check subscription status
            await refreshSubscriptionStatus();
          } catch (rcError) {
            console.error('RevenueCat identification error:', rcError);
          }
        } catch (error) {
          console.error('Error during auth state change:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsSubscribed(false);
        // Reset RevenueCat user
        try {
          await resetUser();
        } catch (rcError) {
          console.error('RevenueCat reset error:', rcError);
        }
      }
    });

    loadUser();

    // Cleanup
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Generate a referral code
  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      // TODO: Implement Google Sign-in with Supabase
      Alert.alert('Coming Soon', 'Google Sign-in will be available soon!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, name: string, username: string, referralCode?: string) => {
    try {
      setLoading(true);
      
      // Check if username is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (existingUser) {
        throw new Error('Username is already taken');
      }
      
      // Generate a new referral code for this user
      const newReferralCode = generateReferralCode();
      
      // Sign up with Supabase
      const { data, error } = await signUpWithEmail(email, password, {
        name,
        username,
        referral_code: newReferralCode,
      });
      
      if (error) throw error;
      
      if (data.user) {
        // Create profile in the database
        await supabase.from('profiles').insert({
          id: data.user.id,
          name,
          email,
          username,
          referral_code: newReferralCode,
          created_at: new Date().toISOString(),
        });
        
        // If the user provided a referral code, apply it
        if (referralCode) {
          // Implement referral code logic
          console.log('Applying referral code:', referralCode);
        }
        
        Alert.alert('Success', 'Account created successfully! Please check your email to verify your account.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await signInWithEmail(email, password);
      
      if (error) throw error;
      
      // User is now signed in via the auth state listener
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      await supabaseSignOut();
      
      // User is now signed out via the auth state listener
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      const { error } = await supabaseResetPassword(email);
      
      if (error) throw error;
      
      Alert.alert('Success', 'Check your email for a password reset link');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (data: Partial<User>) => {
    try {
      setLoading(true);
      
      if (!user) throw new Error('No user is signed in');
      
      // Update the user in Supabase
      const { error } = await updateUserProfile(user.uid, {
        name: data.displayName,
        avatar_url: data.photoURL,
        updated_at: new Date().toISOString(),
      });
      
      if (error) throw error;
      
      // Update the user locally
    setUser(prev => prev ? { ...prev, ...data } : null);
      
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Refresh subscription status
  const refreshSubscriptionStatus = async (): Promise<boolean> => {
    try {
      if (!user) return false;
      
      // Check subscription status with RevenueCat
      const { success, isSubscribed: hasSubscription } = await checkSubscriptionStatus();
      
      if (success) {
        setIsSubscribed(hasSubscription);
        return hasSubscription;
      }
      
      return false;
    } catch (error) {
      console.error('Error refreshing subscription status:', error);
      return false;
    }
  };

  const value: AuthContextProps = {
    user,
    loading,
    isSubscribed,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateProfile,
    refreshSubscriptionStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Default export for Expo Router
const AuthContextExport = { 
  AuthProvider,
  useAuth
};

export default AuthContextExport; 