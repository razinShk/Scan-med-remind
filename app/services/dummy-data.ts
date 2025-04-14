/**
 * This file contains dummy data for local storage
 * These can be used for testing purposes
 */

// Users Collection
export const dummyUsers = [
  {
    id: 'user1',
    email: 'user1@example.com',
    displayName: 'Demo User',
    createdAt: new Date(),
    referralCode: 'DEMO123',
    referralCount: 2,
    referralRewardPoints: 200,
    couponsUsed: ['coupon1'],
    subscription: {
      isPremium: true,
      productId: 'med_scan_yearly',
      purchaseDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      couponCodeUsed: 'WELCOME50',
    }
  },
  {
    id: 'user2',
    email: 'user2@example.com',
    displayName: 'Test User',
    createdAt: new Date(),
    referralCode: 'TEST456',
    referralCount: 0,
    referralRewardPoints: 0,
    couponsUsed: [],
    referredBy: 'user1',
    referralApplied: true,
  }
];

// Coupons Collection
export const dummyCoupons = [
  {
    id: 'coupon1',
    code: 'WELCOME50',
    discountType: 'percentage', // 'percentage' or 'fixed'
    discountValue: 50, // 50% off
    description: 'Welcome discount for new users',
    isActive: true,
    createdAt: new Date(),
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    usageLimit: 1000,
    usageCount: 123,
    oneTimeUse: true, // Can be used only once per user
  },
  {
    id: 'coupon2',
    code: 'SUMMER2023',
    discountType: 'percentage',
    discountValue: 20, // 20% off
    description: 'Summer promotion',
    isActive: true,
    createdAt: new Date(),
    expirationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    usageLimit: 500,
    usageCount: 89,
    oneTimeUse: true,
  },
  {
    id: 'coupon3',
    code: 'MEDREMIND100',
    discountType: 'fixed',
    discountValue: 100, // ₹100 off
    description: 'Fixed amount discount',
    isActive: true,
    createdAt: new Date(),
    expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    usageLimit: 200,
    usageCount: 45,
    oneTimeUse: true,
  }
];

// Referrals Collection
export const dummyReferrals = [
  {
    id: 'referral1',
    referrerId: 'user1',
    referredUserId: 'user2',
    createdAt: new Date(),
    rewardsApplied: true,
    rewardsAppliedAt: new Date(),
  }
];

// Subscriptions Collection
export const dummySubscriptions = [
  {
    id: 'user1', // Using user ID as the document ID
    isPremium: true,
    productId: 'med_scan_yearly',
    purchaseDate: new Date().toISOString(),
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    couponCodeUsed: 'WELCOME50',
    updatedAt: new Date(),
  }
];

/**
 * Note about database seeding:
 * 
 * This app no longer uses Firebase. All data is stored locally using AsyncStorage.
 * If you need to pre-populate the app with data, you could create a function to
 * save this dummy data to AsyncStorage on first app launch.
 */

// Default export for Expo Router
const dummyData = {
  dummyUsers,
  dummyCoupons,
  dummyReferrals,
  dummySubscriptions
};

export default dummyData; 