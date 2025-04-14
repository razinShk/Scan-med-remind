import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Get Supabase credentials from environment variables
const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication functions
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUpWithEmail = async (email: string, password: string, metadata?: { [key: string]: any }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  return { data, error };
};

export const updateUserProfile = async (userId: string, userData: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(userData)
    .eq('id', userId);
  return { data, error };
};

// Subscription related functions
export const getUserSubscription = async (userId: string) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return { data, error };
};

export const saveSubscription = async (subscriptionData: any) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert(subscriptionData);
  return { data, error };
};

export const validateCouponCode = async (couponCode: string) => {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', couponCode)
    .eq('active', true)
    .single();
  return { data, error };
};

export const applyReferralCode = async (referralCode: string, userId: string) => {
  // Step 1: Check if the referral code is valid
  const { data: referralData, error: referralError } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', referralCode)
    .single();

  if (referralError || !referralData) {
    return { error: 'Invalid referral code' };
  }

  // Step 2: Apply the referral
  const { data, error } = await supabase
    .from('referrals')
    .insert({
      referrer_id: referralData.id,
      referred_id: userId,
      created_at: new Date().toISOString(),
    });

  return { data, error };
}; 