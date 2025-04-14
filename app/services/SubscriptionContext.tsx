import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { useAuth } from './AuthContext';
import Purchases, { PurchasesPackage, PurchasesOffering } from 'react-native-purchases';
import { 
  getOfferings, 
  purchasePackage,
  restorePurchases as restorePurchasesFromRC,
  applyPromoCode 
} from './RevenueCatService';
import { 
  validateCouponCode, 
  saveSubscription,
  getUserSubscription
} from './SupabaseService';

// Define simplified package interface compatible with RevenueCat
interface SimplePackage {
  identifier: string;
  title: string;
  description: string;
  price: number;
  priceString: string;
  period: string;
  rcPackage?: PurchasesPackage; // Store the actual RevenueCat package
}

// Mock packages for when RevenueCat is not available
const MOCK_PACKAGES: SimplePackage[] = [
  {
    identifier: 'monthly',
    title: 'Monthly Plan',
    description: 'Monthly premium subscription',
    price: 200,
    priceString: '₹200/month',
    period: 'month'
  },
  {
    identifier: 'yearly',
    title: 'Yearly Plan',
    description: 'Yearly premium subscription',
    price: 1000,
    priceString: '₹1000/year',
    period: 'year'
  }
];

interface SubscriptionContextProps {
  packages: SimplePackage[];
  selectedPackage: SimplePackage | null;
  isLoading: boolean;
  couponCode: string;
  setCouponCode: (code: string) => void;
  selectPackage: (pkg: SimplePackage) => void;
  validateCoupon: () => Promise<boolean>;
  purchaseSelectedPackage: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  loadPackages: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextProps | undefined>(undefined);

// Flag to track RevenueCat initialization status across the app
let revenueCatAvailable = false;

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, refreshSubscriptionStatus } = useAuth();
  const [packages, setPackages] = useState<SimplePackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<SimplePackage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');

  // Load available packages from RevenueCat or fall back to mock data
  const loadPackages = async () => {
    try {
      setIsLoading(true);
      
      // If user is not authenticated, we should still try to load packages
      // but won't be able to check subscription status
      if (!user) {
        console.log('Loading packages without authenticated user');
      }
      
      // Try to get packages from RevenueCat
      const offering = await getOfferings();
      
      if (offering && offering.availablePackages && offering.availablePackages.length > 0) {
        // RevenueCat is available
        revenueCatAvailable = true;
        
        // Convert RevenueCat packages to our simplified format
        const simplifiedPackages: SimplePackage[] = offering.availablePackages.map(pkg => ({
          identifier: pkg.identifier,
          title: pkg.product.title,
          description: pkg.product.description,
          price: pkg.product.price.amount,
          priceString: pkg.product.priceString,
          period: pkg.packageType.toLowerCase(),
          rcPackage: pkg,
        }));
        
        setPackages(simplifiedPackages);
        // Select first package as default
        if (simplifiedPackages.length > 0 && !selectedPackage) {
          setSelectedPackage(simplifiedPackages[0]);
        }
        console.log('Loaded packages from RevenueCat:', simplifiedPackages.length);
      } else {
        // If no packages could be loaded, use mock data
        console.warn('No packages found in RevenueCat, using mock data');
        setPackages(MOCK_PACKAGES);
        // Select first mock package as default
        if (!selectedPackage) {
          setSelectedPackage(MOCK_PACKAGES[0]);
        }
        revenueCatAvailable = false;
      }
    } catch (error) {
      console.error('Error loading packages:', error);
      // In case of error, fall back to mock packages
      setPackages(MOCK_PACKAGES);
      // Select first mock package as default
      if (!selectedPackage) {
        setSelectedPackage(MOCK_PACKAGES[0]);
      }
      revenueCatAvailable = false;
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load of packages
  useEffect(() => {
    loadPackages();
  }, [user?.uid]); // Reload when user changes

  // Select a package
  const selectPackage = (pkg: SimplePackage) => {
    setSelectedPackage(pkg);
  };

  // Validate coupon code
  const validateCouponFromSupabase = async (): Promise<boolean> => {
    if (!couponCode.trim()) {
      Alert.alert('Error', 'Please enter a coupon code');
      return false;
    }

    try {
      setIsLoading(true);
      
      // Validate coupon with Supabase
      const { data, error } = await validateCouponCode(couponCode.trim().toUpperCase());
      
      if (error || !data) {
        Alert.alert('Error', 'Invalid or expired coupon code');
        return false;
      }
      
      // Apply the coupon code to RevenueCat (Android only)
      if (Platform.OS === 'android') {
        await applyPromoCode(couponCode);
      }
      
      Alert.alert('Success', `Coupon code applied: ${data.discount_percent}% discount!`);
      return true;
    } catch (error) {
      console.error('Error validating coupon:', error);
      Alert.alert('Error', 'Failed to validate coupon');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Purchase selected package
  const purchaseSelectedPackage = async (): Promise<boolean> => {
    if (!selectedPackage) {
      Alert.alert('Error', 'Please select a subscription plan');
      return false;
    }

    try {
      setIsLoading(true);
      
      // If we don't have a RevenueCat package, use mock behavior
      if (!selectedPackage.rcPackage) {
        // For demo purposes without RevenueCat
        Alert.alert('Success', 'Thank you for subscribing!');
        
        // Reset coupon code after successful purchase
        setCouponCode('');
        return true;
      }
      
      // Purchase with RevenueCat
      const { success, isSubscribed, error, userCancelled } = await purchasePackage(selectedPackage.rcPackage);
      
      if (userCancelled) {
        // User cancelled the purchase - not an error
        return false;
      }
      
      if (!success || error) {
        Alert.alert('Error', error?.message || 'Failed to complete purchase');
        return false;
      }
      
      // Refresh subscription status in the auth context
      await refreshSubscriptionStatus();
      
      // Save subscription information to Supabase
      if (user) {
        await saveSubscription({
          user_id: user.uid,
          package_id: selectedPackage.identifier,
          purchase_date: new Date().toISOString(),
          active: true,
          expiry_date: null, // RevenueCat manages this
        });
      }
      
      // Reset coupon code after successful purchase
      setCouponCode('');
      
      return isSubscribed;
    } catch (error: any) {
      console.error('Error purchasing package:', error);
      Alert.alert('Error', error.message || 'Failed to complete purchase');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Restore purchases
  const restorePurchases = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Restore purchases with RevenueCat
      const { success, isSubscribed, error } = await restorePurchasesFromRC();
      
      if (!success || error) {
        Alert.alert('Error', error?.message || 'Failed to restore purchases');
        return false;
      }
      
      // Update subscription status in the auth context
      await refreshSubscriptionStatus();
      
      if (isSubscribed) {
        Alert.alert('Success', 'Your purchases have been restored!');
        return true;
      } else {
        Alert.alert('Info', 'No active subscriptions found to restore.');
        return false;
      }
    } catch (error: any) {
      console.error('Error restoring purchases:', error);
      Alert.alert('Error', error.message || 'Failed to restore purchases');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    packages,
    selectedPackage,
    isLoading,
    couponCode,
    setCouponCode,
    selectPackage,
    validateCoupon: validateCouponFromSupabase,
    purchaseSelectedPackage,
    restorePurchases,
    loadPackages,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

// Default export for Expo Router
const SubscriptionContextExport = {
  SubscriptionProvider,
  useSubscription
};

export default SubscriptionContextExport; 