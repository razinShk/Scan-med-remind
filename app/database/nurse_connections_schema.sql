-- Nurse Connection system tables

-- Table for storing nurse connections
CREATE TABLE IF NOT EXISTS nurse_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (sender_id, receiver_id)
);

-- Table for storing which medications are shared in each connection
CREATE TABLE IF NOT EXISTS nurse_connection_medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES nurse_connections(id) ON DELETE CASCADE,
  medication_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (connection_id, medication_id)
);

-- Add RLS policies to secure the tables
ALTER TABLE nurse_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurse_connection_medications ENABLE ROW LEVEL SECURITY;

-- Policies for nurse_connections
-- Users can view connections they're part of
CREATE POLICY "Users can view their own connections" 
  ON nurse_connections 
  FOR SELECT 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can create connections where they are the sender
CREATE POLICY "Users can create connections as sender" 
  ON nurse_connections 
  FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

-- Users can update connections they're part of
CREATE POLICY "Users can update their own connections" 
  ON nurse_connections 
  FOR UPDATE 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can delete connections they're part of
CREATE POLICY "Users can delete their own connections" 
  ON nurse_connections 
  FOR DELETE 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policies for nurse_connection_medications
-- Users can view medications in connections they're part of
CREATE POLICY "Users can view medications in their connections" 
  ON nurse_connection_medications 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM nurse_connections 
      WHERE nurse_connections.id = nurse_connection_medications.connection_id 
      AND (nurse_connections.sender_id = auth.uid() OR nurse_connections.receiver_id = auth.uid())
    )
  );

-- Users can add medications to connections they created
CREATE POLICY "Users can add medications to their connections" 
  ON nurse_connection_medications 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nurse_connections 
      WHERE nurse_connections.id = nurse_connection_medications.connection_id 
      AND nurse_connections.sender_id = auth.uid()
    )
  );

-- Users can delete medications from connections they created
CREATE POLICY "Users can delete medications from their connections" 
  ON nurse_connection_medications 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM nurse_connections 
      WHERE nurse_connections.id = nurse_connection_medications.connection_id 
      AND nurse_connections.sender_id = auth.uid()
    )
  ); 