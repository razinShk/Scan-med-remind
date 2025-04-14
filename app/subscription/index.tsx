import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../services/AuthContext";
import { useSubscription } from "../services/SubscriptionContext";

const { width } = Dimensions.get("window");

export default function SubscriptionScreen() {
  const router = useRouter();
  const { user, isSubscribed } = useAuth();
  const {
    packages,
    selectedPackage,
    isLoading,
    couponCode,
    setCouponCode,
    selectPackage,
    validateCoupon,
    purchaseSelectedPackage,
    restorePurchases,
    loadPackages,
  } = useSubscription();

  const [showCouponInput, setShowCouponInput] = useState(false);

  useEffect(() => {
    // Redirect to auth if not logged in
    if (!user) {
      router.replace("/auth");
    } else {
      // Load packages
      loadPackages();
    }
  }, [user]);

  const handlePurchase = async () => {
    const success = await purchaseSelectedPackage();
    if (success) {
      Alert.alert("Success", "Thank you for your subscription!", [
        { text: "OK", onPress: () => router.replace("/home") },
      ]);
    }
  };

  const handleRestore = async () => {
    const restored = await restorePurchases();
    if (restored) {
      Alert.alert("Success", "Your subscription has been restored!", [
        { text: "OK", onPress: () => router.replace("/home") },
      ]);
    }
  };

  const formatPrice = (priceString: string) => {
    // Convert prices to INR format
    // Example: "$9.99" -> "₹200"
    return priceString.replace("$", "₹");
  };

  // Check if already subscribed
  if (isSubscribed) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={["#4CAF50", "#2E7D32"]}
          style={styles.headerGradient}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Premium</Text>
        </LinearGradient>

        <View style={styles.subscriptionActive}>
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          <Text style={styles.activeTitle}>You're Premium!</Text>
          <Text style={styles.activeDescription}>
            You already have an active subscription. Enjoy all premium features!
          </Text>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => router.replace("/home")}
          >
            <Text style={styles.homeButtonText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#4CAF50", "#2E7D32"]}
        style={styles.headerGradient}
      >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
          <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Premium Subscription</Text>
      </LinearGradient>

      <ScrollView>
        <View style={styles.content}>
          <View style={styles.premiumBanner}>
            <Ionicons name="star" size={40} color="#FFD700" />
            <Text style={styles.bannerTitle}>Upgrade to Premium</Text>
            <Text style={styles.bannerSubtitle}>
              Unlock all features and remove limitations
            </Text>
              </View>

          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Premium Features</Text>
            
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.featureText}>Unlimited medications</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.featureText}>Advanced reminder options</Text>
                </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.featureText}>Detailed medication history</Text>
                </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.featureText}>Export and share data</Text>
                </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.featureText}>Priority customer support</Text>
                </View>
              </View>

          <Text style={styles.plansTitle}>Select a Plan</Text>

          {isLoading ? (
            <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
          ) : (
            <>
              {packages.length === 0 ? (
                <Text style={styles.noPackagesText}>
                  No subscription plans available right now. Please check back later.
                </Text>
              ) : (
              <View style={styles.plansContainer}>
                  {packages.map((pkg, index) => (
                  <TouchableOpacity
                      key={index}
                    style={[
                      styles.planCard,
                        selectedPackage?.identifier === pkg.identifier &&
                          styles.selectedPlan,
                      ]}
                      onPress={() => selectPackage(pkg)}
                    >
                      <View style={styles.planHeader}>
                        <Text style={styles.planName}>
                          {pkg.period === "month" ? "Monthly" : "Yearly"}
                        </Text>
                        {pkg.period === "year" && (
                          <View style={styles.saveBadge}>
                            <Text style={styles.saveText}>Save 58%</Text>
                          </View>
                        )}
                      </View>
                      
                      <Text style={styles.planPrice}>
                        {pkg.period === "month"
                          ? "₹200/month"
                          : "₹1000/year"}
                      </Text>
                      
                      {pkg.period === "month" ? (
                        <Text style={styles.planFeature}>
                          1-month free trial
                        </Text>
                      ) : (
                        <Text style={styles.planFeature}>
                          1-month free trial
                        </Text>
                      )}
                    
                    <View style={styles.radioContainer}>
                      <View 
                        style={[
                          styles.radioOuter, 
                            selectedPackage?.identifier === pkg.identifier &&
                              styles.radioOuterSelected,
                        ]}
                      >
                          {selectedPackage?.identifier === pkg.identifier && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              )}

              {/* Coupon Code Section */}
              {showCouponInput ? (
              <View style={styles.couponContainer}>
                  <TextInput
                    style={styles.couponInput}
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChangeText={setCouponCode}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity 
                    style={styles.applyCouponButton}
                    onPress={validateCoupon}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.applyCouponText}>Apply</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.couponLink}
                  onPress={() => setShowCouponInput(true)}
                >
                  <Ionicons name="pricetag-outline" size={16} color="#4CAF50" />
                  <Text style={styles.couponLinkText}>I have a coupon code</Text>
                </TouchableOpacity>
              )}

              {/* Referral Code Note */}
              <Text style={styles.referralNote}>
                Your referral code: {user?.referralCode || "Login to see your code"}
              </Text>
              <Text style={styles.referralDescription}>
                Share your referral code with friends. They get extended trial and you
                get rewards!
                </Text>
                
              {/* Action Buttons */}
                <TouchableOpacity 
                  style={styles.subscribeButton}
                onPress={handlePurchase}
                disabled={isLoading || !selectedPackage}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.subscribeButtonText}>
                      Subscribe Now
                    </Text>
                  )}
                </TouchableOpacity>
                
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={isLoading}
              >
                <Text style={styles.restoreButtonText}>
                  Restore Purchases
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 15,
  },
  content: {
    padding: 20,
  },
  premiumBanner: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
    color: "#333",
  },
  bannerSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
  },
  featuresContainer: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  plansTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  plansContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    width: width / 2 - 30,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  selectedPlan: {
    borderColor: "#4CAF50",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  planName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  saveBadge: {
    backgroundColor: "#FFD700",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  saveText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#333",
  },
  planPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 5,
  },
  planFeature: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
  },
  radioContainer: {
    alignItems: "center",
    marginTop: 5,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#999",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: "#4CAF50",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
  },
  couponContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  couponInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "white",
  },
  applyCouponButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  applyCouponText: {
    color: "white",
    fontWeight: "600",
  },
  couponLink: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  couponLinkText: {
    color: "#4CAF50",
    marginLeft: 5,
    fontSize: 14,
  },
  referralNote: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  referralDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  subscribeButton: {
    backgroundColor: "#4CAF50",
    height: 55,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  subscribeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  restoreButton: {
    borderWidth: 1,
    borderColor: "#4CAF50",
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  restoreButtonText: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "500",
  },
  loader: {
    marginVertical: 30,
  },
  noPackagesText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginVertical: 20,
  },
  subscriptionActive: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  activeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
  },
  activeDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  homeButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  homeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
}); 