# NURSE Connect Feature Documentation

## Overview

NURSE Connect allows any user of the app to act as a "nurse" for another user. There are no special user types - the feature simply enables users to share their medication information and reminders with others who can help monitor their medication adherence.

## Key Functionality

1. **Sending Connection Requests**
   - Any user can send a nurse connection request to another user by entering their username
   - The sender selects which medications to share with the recipient
   - A connection request is sent and awaits approval

2. **Receiving Connection Requests**
   - Users receive notifications when someone sends them a nurse connection request
   - They can view all pending requests in the "Received" tab
   - Each request shows the medications being shared
   - Each request can be accepted or rejected

3. **Active Connections**
   - After accepting a connection, the recipient becomes a "nurse" for the sender
   - Shared medications appear in the nurse's medication list with the original user's name
   - The nurse receives reminders for the shared medications

4. **Managing Connections**
   - Both parties can remove connections at any time
   - Senders can update which medications are shared

5. **Shared Medications Tab**
   - Dedicated tab for viewing all medications shared with you as a nurse
   - Enable/disable reminders for individual shared medications
   - Clear overview of medication schedules and dosages

## Technical Implementation

### Database Schema

The feature uses two main tables in Supabase:

1. **nurse_connections**
   - Stores the connection between users
   - Fields: id, sender_id, receiver_id, status, created_at, updated_at
   - Status can be: pending, accepted, rejected

2. **nurse_connection_medications**
   - Links medications to connections
   - Fields: id, connection_id, medication_id, created_at

### Key Components

1. **Nurse Screen (app/nurse/index.tsx)**
   - Main interface for the NURSE Connect feature
   - Includes tabs for:
     - Send: Creating new nurse connections
     - Received: Managing received connection requests and active connections
     - Shared: Viewing and managing shared medications

2. **NurseConnectionService (app/services/NurseConnectionService.ts)**
   - Handles loading shared medications
   - Syncs shared medications to local storage
   - Schedules reminders for shared medications

3. **SupabaseService (app/services/SupabaseService.ts)**
   - Provides database functions for:
     - Sending connection requests
     - Getting pending requests with medication information
     - Responding to requests
     - Managing connections and medications

### Data Flow

1. User sends a connection request with selected medications
2. Request appears in recipient's pending requests tab with medication names
3. When recipient accepts:
   - Connection status updates to "accepted"
   - `syncSharedMedications` function loads the shared medications
   - Reminders are scheduled for the shared medications
4. Medications are marked as "shared" to distinguish them
5. Shared medications appear in the "Shared" tab with reminder controls

## User Experience

### Sending Requests
1. Navigate to Nurse Connect
2. Enter the username of the recipient
3. Select medications to share
4. Send the connection request

### Accepting/Rejecting Requests
1. Navigate to Nurse Connect > Received tab
2. View pending requests with medication information
3. Accept or reject each request

### Viewing Shared Medications
1. Navigate to Nurse Connect > Shared tab 
2. View all medications shared with you
3. Toggle reminder settings for each medication
4. Tap refresh to update the list

### Managing Active Connections
1. Patients can see all their active nurse connections in the "Send" tab
2. Nurses can see all their active patient connections in the "Received" tab
3. Both can remove connections with the X button

## Security & Privacy

- Row Level Security (RLS) ensures users can only access:
  - Their own connection data
  - Connections where they are the sender or receiver
  - Medication data through authorized connections
- Users maintain control over their shared data
- Connections can be terminated by either party

## Known Issues and Future Improvements

- Real-time synchronization of shared medications
- Additional filtering and sorting options for the shared medications list
- Ability for nurses to mark medications as taken for tracking adherence
- Analytics dashboard for nurse oversight
- Direct messaging between patients and nurses 