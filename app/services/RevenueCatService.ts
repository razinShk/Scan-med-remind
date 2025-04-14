import Purchases, { PurchasesPackage, PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';
import { REVENUECAT_PUBLIC_SDK, REVENUECAT_SECRET_KEY } from '@env';

// Add a polyfill for isConfigured if not available
if (typeof Purchases.isConfigured === 'undefined') {
  let _isConfigured = false;
  
  // Store the original configure method
  const originalConfigure = Purchases.configure;
  
  // Override the configure method to set our flag
  Purchases.configure = (options) => {
    _isConfigured = true;
    return originalConfigure(options);
  };
  
  // Add the isConfigured property
  Object.defineProperty(Purchases, 'isConfigured', {
    get: () => _isConfigured
  });
}

// Compatibility layer for RevenueCat initialization
const safelyConfigurePurchases = (apiKey: string, appUserID: string | null = null) => {
  return new Promise<boolean>((resolve, reject) => {
    try {
      // Some versions of react-native-purchases might throw during configuration
      // or might have different method signatures
      if (!Purchases || typeof Purchases.configure !== 'function') {
        console.warn('RevenueCat Purchases SDK not properly loaded');
        resolve(false);
        return;
      }

      // Configure options based on what the version supports
      const configOptions = {
        apiKey,
        appUserID,
        observerMode: false // This parameter exists in newer versions
      };

      // Try the newer style configuration first
      try {
        Purchases.configure(configOptions);
        resolve(true);
      } catch (e) {
        // Fall back to a simpler configuration for older versions
        try {
          // @ts-ignore - Ignoring typechecking for backward compatibility
          Purchases.setup(apiKey, appUserID);
          resolve(true);
        } catch (setupError) {
          console.error('Failed to initialize RevenueCat with fallback method:', setupError);
          reject(setupError);
        }
      }
    } catch (error) {
      console.error('Error in safelyConfigurePurchases:', error);
      reject(error);
    }
  });
};

// Initialize RevenueCat with API keys from environment variables
export const initializeRevenueCat = async () => {
  try {
    // Use the API key based on platform
    const apiKey = Platform.OS === 'ios' 
      ? REVENUECAT_SECRET_KEY // Use secret key for iOS
      : REVENUECAT_PUBLIC_SDK;
    
    if (!apiKey) {
      console.error('RevenueCat API key not found');
      return;
    }

    // Use our safe initialization method
    const success = await safelyConfigurePurchases(apiKey);
    
    if (success) {
      // Set the RevenueCat debug logs in development mode
      if (__DEV__ && Purchases.setLogLevel) {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      }
      
      console.log(`RevenueCat initialized successfully for ${Platform.OS}`);
    } else {
      console.warn('RevenueCat initialization did not complete successfully');
    }
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
    // Don't rethrow - let the app continue without RevenueCat functionality
  }
};

// Set the user ID for RevenueCat
export const identifyUser = async (userId: string) => {
  try {
    // Check if RevenueCat is available
    if (!Purchases || typeof Purchases.logIn !== 'function') {
      console.warn('RevenueCat not properly initialized - cannot identify user');
      return { success: false, error: new Error('RevenueCat not initialized') };
    }
    
    await Purchases.logIn(userId);
    return { success: true };
  } catch (error) {
    console.error('Error identifying user with RevenueCat:', error);
    return { success: false, error };
  }
};

// Reset the user ID (used on logout)
export const resetUser = async () => {
  try {
    // Check if RevenueCat is available
    if (!Purchases || typeof Purchases.logOut !== 'function') {
      console.warn('RevenueCat not properly initialized - cannot reset user');
      return { success: false, error: new Error('RevenueCat not initialized') };
    }
    
    await Purchases.logOut();
    return { success: true };
  } catch (error) {
    console.error('Error resetting user with RevenueCat:', error);
    return { success: false, error };
  }
};

// Get available packages
export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  try {
    // Check if RevenueCat is available
    if (!Purchases || typeof Purchases.getOfferings !== 'function') {
      console.warn('RevenueCat not properly initialized - cannot get offerings');
      return null;
    }
    
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Error getting offerings:', error);
    return null;
  }
};

// Purchase a package
export const purchasePackage = async (pkg: PurchasesPackage) => {
  try {
    // Check if RevenueCat is available
    if (!Purchases || typeof Purchases.purchasePackage !== 'function') {
      console.warn('RevenueCat not properly initialized - cannot purchase package');
      return { success: false, error: new Error('RevenueCat not initialized') };
    }
    
    const { customerInfo, productIdentifier } = await Purchases.purchasePackage(pkg);
    const isSubscribed = typeof customerInfo.entitlements.active['premium'] !== 'undefined';
    return { 
      success: true, 
      isSubscribed, 
      customerInfo, 
      productIdentifier 
    };
  } catch (error: any) {
    // Check if the user canceled the purchase
    if (error.userCancelled) {
      return { success: false, userCancelled: true };
    }
    console.error('Error purchasing package:', error);
    return { success: false, error };
  }
};

// Check if user has active subscription
export const checkSubscriptionStatus = async () => {
  try {
    // Check if RevenueCat is available
    if (!Purchases || typeof Purchases.getCustomerInfo !== 'function') {
      console.warn('RevenueCat not properly initialized - cannot check subscription status');
      return { success: false, isSubscribed: false, error: new Error('RevenueCat not initialized') };
    }
    
    const customerInfo = await Purchases.getCustomerInfo();
    const isSubscribed = typeof customerInfo.entitlements.active['premium'] !== 'undefined';
    return { 
      success: true, 
      isSubscribed, 
      customerInfo 
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return { success: false, isSubscribed: false, error };
  }
};

// Restore purchases
export const restorePurchases = async () => {
  try {
    // Check if RevenueCat is available
    if (!Purchases || typeof Purchases.restorePurchases !== 'function') {
      console.warn('RevenueCat not properly initialized - cannot restore purchases');
      return { success: false, isSubscribed: false, error: new Error('RevenueCat not initialized') };
    }
    
    const customerInfo = await Purchases.restorePurchases();
    const isSubscribed = typeof customerInfo.entitlements.active['premium'] !== 'undefined';
    return { 
      success: true, 
      isSubscribed, 
      customerInfo 
    };
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return { success: false, error };
  }
};

// Apply promo code (Android only)
export const applyPromoCode = async (promoCode: string) => {
  try {
    if (Platform.OS !== 'android') {
      return { success: false, error: 'Promo codes are only supported on Android' };
    }
    
    // Check if RevenueCat is available
    if (!Purchases || typeof Purchases.invalidateCustomerInfoCache !== 'function') {
      console.warn('RevenueCat not properly initialized - cannot apply promo code');
      return { success: false, error: new Error('RevenueCat not initialized') };
    }
    
    const customerInfo = await Purchases.invalidateCustomerInfoCache();
    return { success: true, customerInfo };
  } catch (error) {
    console.error('Error applying promo code:', error);
    return { success: false, error };
  }
}; 