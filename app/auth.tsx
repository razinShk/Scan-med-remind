import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "./services/AuthContext";

const { width } = Dimensions.get("window");

enum AuthMode {
  SIGN_IN,
  SIGN_UP,
  RESET_PASSWORD,
}

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, signUp, resetPassword, signInWithGoogle, loading, user } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [mode, setMode] = useState(AuthMode.SIGN_IN);
  const [error, setError] = useState("");
  
  // If already authenticated, redirect to home
  useEffect(() => {
    if (user) {
      router.replace("/home");
    }
  }, [user]);

  const handleSubmit = async () => {
    try {
      setError("");
      
      if (mode === AuthMode.SIGN_IN) {
        // Sign in
        if (!email || !password) {
          setError("Email and password are required");
          return;
        }
        
        try {
          await signIn(email, password);
          // If we get here without an error and user is set, navigate
          // The auth state listener in AuthContext will set the user
          // We'll let the useEffect below handle the navigation once user is set
        } catch (err) {
          console.error("Sign in error:", err);
          setError("Invalid email or password. Please try again.");
          return;
        }
      } else if (mode === AuthMode.SIGN_UP) {
        // Sign up
        if (!email || !password || !confirmPassword || !name || !username) {
          setError("All fields are required");
          return;
        }
        
        if (password !== confirmPassword) {
          setError("Passwords don't match");
          return;
        }
        
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          return;
        }

        if (username.length < 3) {
          setError("Username must be at least 3 characters");
          return;
        }
        
        try {
          await signUp(email, password, name, username, referralCode);
          // If signup is successful, the auth listener will update the user
          // and the useEffect will navigate
        } catch (err) {
          console.error("Sign up error:", err);
          setError("Failed to create account. Please try again.");
          return;
        }
      } else if (mode === AuthMode.RESET_PASSWORD) {
        // Reset password
        if (!email) {
          setError("Email is required");
          return;
        }
        
        await resetPassword(email);
        setError("Password reset email sent. Please check your inbox.");
        setMode(AuthMode.SIGN_IN);
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Authentication failed. Please try again.");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError("");
      await signInWithGoogle();
      // Google sign-in isn't implemented yet (as per the AuthContext code),
      // but when it is, the user will be set by the auth listener
      // and useEffect will navigate
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError("Google sign-in failed. Please try again.");
    }
  };

  const renderForm = () => {
    switch (mode) {
      case AuthMode.SIGN_IN:
        return (
          <>
            <Text style={styles.cardTitle}>Sign In</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            
            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>
            
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleIcon}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </TouchableOpacity>
            
            <View style={styles.links}>
              <TouchableOpacity onPress={() => setMode(AuthMode.RESET_PASSWORD)}>
                <Text style={styles.link}>Forgot Password?</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => setMode(AuthMode.SIGN_UP)}>
                <Text style={styles.link}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </>
        );
        
      case AuthMode.SIGN_UP:
        return (
          <>
            <Text style={styles.cardTitle}>Create Account</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            
            <TextInput
              style={styles.input}
              placeholder="Referral Code (Optional)"
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
            />
            
            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>
            
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleIcon}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Sign up with Google</Text>
            </TouchableOpacity>
            
            <View style={styles.links}>
              <TouchableOpacity onPress={() => setMode(AuthMode.SIGN_IN)}>
                <Text style={styles.link}>Already have an account? Sign In</Text>
              </TouchableOpacity>
            </View>
          </>
        );
        
      case AuthMode.RESET_PASSWORD:
        return (
          <>
            <Text style={styles.cardTitle}>Reset Password</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.links}>
              <TouchableOpacity onPress={() => setMode(AuthMode.SIGN_IN)}>
                <Text style={styles.link}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </>
        );
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
    <LinearGradient colors={["#1976D2", "#0D47A1"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/NoBgLogoMed.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>MedRemind</Text>
          <Text style={styles.subtitle}>Your Personal Medication Assistant</Text>
          
          <View style={styles.card}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {renderForm()}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    width: width * 0.5, // 50% of screen width
    height: width * 0.5, // Keep it square
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 0,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 30,
    textAlign: "center",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    width: width - 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
    width: "100%",
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 10,
    color: "#888",
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    backgroundColor: "#4285F4",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  googleIcon: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  googleButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
  links: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 20,
    flexWrap: "wrap",
  },
  link: {
    color: "#4CAF50",
    fontSize: 14,
    marginVertical: 5,
  },
  errorText: {
    color: "red",
    marginBottom: 15,
    textAlign: "center",
  },
});
