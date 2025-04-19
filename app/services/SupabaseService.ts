// Add type declarations for environment variables
declare module '@env' {
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
  export const SUPABASE_SERVICE_ROLE: string;
}

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get Supabase credentials from environment variables
const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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

// Nurse Connection functions
export const sendNurseConnectRequest = async (
  userId: string,
  nurseUsername: string,
  medicationIds: string[]
) => {
  console.log('Sending nurse connect request:', { userId, nurseUsername, medicationCount: medicationIds.length });

  try {
    // First check if the nurse user exists by username (case insensitive)
    const { data: nurseData, error: nurseError } = await supabase
      .from('profiles')
      .select('id, username, name')
      .ilike('username', nurseUsername) // Use case-insensitive comparison
      .single();

    console.log('Found nurse profile:', nurseData, 'Error:', nurseError);

    if (nurseError || !nurseData) {
      console.error('Error finding nurse by username:', nurseError);
      return { error: 'User with this username does not exist' };
    }

    // Cannot connect to yourself
    if (nurseData.id === userId) {
      return { error: 'You cannot connect to yourself' };
    }

    // Log all the users in the database for debugging
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(10);
    
    console.log('Available users in database (first 10):', allUsers);

    // Check if a connection already exists
    const { data: existingConnection, error: connectionError } = await supabase
      .from('nurse_connections')
      .select('id, status')
      .eq('sender_id', userId)
      .eq('receiver_id', nurseData.id)
      .single();

    console.log('Existing connection check:', { existingConnection, connectionError });

    if (existingConnection) {
      // If a connection exists, update medications if needed
      if (existingConnection.status === 'accepted') {
        // Update medication list
        const { data, error } = await supabase
          .from('nurse_connection_medications')
          .upsert(
            medicationIds.map(medId => ({
              connection_id: existingConnection.id,
              medication_id: medId
            })),
            { onConflict: 'connection_id, medication_id' }
          );
        return { data: { ...existingConnection, updated: true }, error };
      }
      return { error: 'Connection request already sent and is pending' };
    }

    // Create new connection with clear status
    const { data: connection, error: insertError } = await supabase
      .from('nurse_connections')
      .insert({
        sender_id: userId,
        receiver_id: nurseData.id,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    console.log('New connection created:', connection, 'Error:', insertError);

    if (insertError) {
      console.error('Error inserting new connection:', insertError);
      return { error: insertError };
    }

    // Add medications to connection
    if (connection && medicationIds.length > 0) {
      const { data: medData, error: medicationError } = await supabase
        .from('nurse_connection_medications')
        .insert(
          medicationIds.map(medId => ({
            connection_id: connection.id,
            medication_id: medId
          }))
        )
        .select();
      
      console.log('Added medications to connection:', medData, 'Error:', medicationError);
      
      if (medicationError) {
        console.error('Error adding medications to connection:', medicationError);
        return { data: connection, error: medicationError };
      }
    }

    // Verify the connection was created
    const { data: verifyConnection } = await supabase
      .from('nurse_connections')
      .select('*')
      .eq('id', connection.id)
      .single();
    
    console.log('Verification of created connection:', verifyConnection);

    return { data: connection, error: null };
  } catch (err) {
    console.error('Unexpected error in sendNurseConnectRequest:', err);
    return { error: err };
  }
};

export const getPendingNurseRequests = async (userId: string) => {
  console.log('Fetching pending requests for user:', userId);
  
  try {
    // Use a simpler query without relying on the join
    const { data, error } = await supabase
      .from('nurse_connections')
      .select('*')
      .eq('receiver_id', userId)
      .eq('status', 'pending');
    
    console.log('Pending requests raw result:', { data, error });
    
    if (!data || data.length === 0) {
      return { data: [], error };
    }
    
    // Manually fetch sender profiles and medications
    const enhancedRequests = await Promise.all(
      data.map(async (request) => {
        // Get sender profile separately
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, name, email')
          .eq('id', request.sender_id)
          .single();
          
        // Get medications for this connection
        const { data: medicationsData } = await supabase
          .from('nurse_connection_medications')
          .select('medication_id')
          .eq('connection_id', request.id);
        
        return {
          ...request,
          profiles: profileData || { username: 'unknown', name: 'Unknown User', email: '' },
          nurse_connection_medications: medicationsData || []
        };
      })
    );
    
    console.log('Enhanced requests with profiles and medications:', enhancedRequests);
    return { data: enhancedRequests, error: null };
  } catch (err) {
    console.error('Unexpected error in getPendingNurseRequests:', err);
    return { data: [], error: err };
  }
};

export const getActiveNurseConnections = async (userId: string, asNurse = false) => {
  console.log(`Getting active nurse connections for user ${userId} as ${asNurse ? 'nurse' : 'patient'}`);
  
  try {
    // First get the connections without joins to avoid potential issues
    const { data: connections, error: connectionsError } = await supabase
      .from('nurse_connections')
      .select('id, sender_id, receiver_id, status, created_at')
      .eq(asNurse ? 'receiver_id' : 'sender_id', userId)
      .eq('status', 'accepted');
    
    console.log('Raw connections:', connections, connectionsError);
    
    if (connectionsError || !connections || connections.length === 0) {
      console.log('No active connections found or error occurred');
      return { data: [], error: connectionsError };
    }
    
    // Now get the profiles data for each connection
    const enhancedConnections = await Promise.all(
      connections.map(async (connection) => {
        const otherUserId = asNurse ? connection.sender_id : connection.receiver_id;
        
        // Get profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, name, email')
          .eq('id', otherUserId)
          .single();
        
        // Get medications for this connection
        const { data: medicationsData } = await supabase
          .from('nurse_connection_medications')
          .select('medication_id')
          .eq('connection_id', connection.id);
        
        return {
          ...connection,
          profiles: profileData || { username: 'unknown', name: 'Unknown User', email: '' },
          nurse_connection_medications: medicationsData || []
        };
      })
    );
    
    console.log('Enhanced connections with profiles and medications:', enhancedConnections);
    return { data: enhancedConnections, error: null };
  } catch (error) {
    console.error('Error in getActiveNurseConnections:', error);
    return { data: [], error };
  }
};

export const respondToNurseRequest = async (
  connectionId: string, 
  accept: boolean
) => {
  const { data, error } = await supabase
    .from('nurse_connections')
    .update({
      status: accept ? 'accepted' : 'rejected',
      updated_at: new Date().toISOString()
    })
    .eq('id', connectionId)
    .select();

  return { data, error };
};

export const removeNurseConnection = async (connectionId: string) => {
  // First delete associated medications
  await supabase
    .from('nurse_connection_medications')
    .delete()
    .eq('connection_id', connectionId);
  
  // Then delete the connection
  const { data, error } = await supabase
    .from('nurse_connections')
    .delete()
    .eq('id', connectionId);

  return { data, error };
};

export const getNurseConnectionMedications = async (
  userId: string, 
  connectionId: string
) => {
  console.log(`Fetching medications for connection ${connectionId} and user ${userId}`);
  
  try {
    // First get the medication_ids from the connection
    const { data: connectionMeds, error: connectionError } = await supabase
      .from('nurse_connection_medications')
      .select('medication_id')
      .eq('connection_id', connectionId);
    
    console.log('Connection medications result:', connectionMeds, connectionError);
    
    if (connectionError || !connectionMeds || connectionMeds.length === 0) {
      console.log('No medications found for this connection or error occurred');
      return { data: [], error: connectionError };
    }
    
    // We need to return the raw medication IDs even if we can't fetch the full medication details
    // This allows the client to potentially look them up locally
    return { data: connectionMeds, error: null };
    
  } catch (error) {
    console.error('Error in getNurseConnectionMedications:', error);
    return { data: [], error };
  }
}; 