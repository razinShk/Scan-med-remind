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
   - Each request can be accepted or rejected

3. **Active Connections**
   - After accepting a connection, the recipient becomes a "nurse" for the sender
   - Shared medications appear in the nurse's medication list with the original user's name
   - The nurse receives reminders for the shared medications

4. **Managing Connections**
   - Both parties can remove connections at any time
   - Senders can update which medications are shared

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

2. **NurseConnectionService (app/services/NurseConnectionService.ts)**
   - Handles loading shared medications
   - Syncs shared medications to local storage
   - Schedules reminders for shared medications

3. **SupabaseService (app/services/SupabaseService.ts)**
   - Provides database functions for:
     - Sending connection requests
     - Getting pending requests
     - Responding to requests
     - Managing connections and medications

### Data Flow

1. User sends a connection request with selected medications
2. Request appears in recipient's pending requests
3. When recipient accepts:
   - Connection status updates to "accepted"
   - `syncSharedMedications` function loads the shared medications
   - Reminders are scheduled for the shared medications
4. Medications are marked as "shared" to distinguish them

## User Experience

### Sending Requests
1. Navigate to Nurse Connect
2. Enter the username of the recipient
3. Select medications to share
4. Send the connection request

### Accepting/Rejecting Requests
1. Navigate to Nurse Connect > Received tab
2. View pending requests
3. Accept or reject each request

### Viewing Shared Medications
1. Shared medications appear in the standard medication list
2. They are labeled with the sender's name
3. Regular reminders are received for these medications

## Security & Privacy

- Row Level Security (RLS) ensures users can only access:
  - Their own connection data
  - Connections where they are the sender or receiver
  - Medication data through authorized connections
- Users maintain control over their shared data
- Connections can be terminated by either party

## Limitations

- Medications are read-only for the nurse
- No ability to modify medication settings as a nurse
- No separate nurse-specific notification settings
- Real-time updates require manual refresh 