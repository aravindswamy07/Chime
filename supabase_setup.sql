-- Add room_code column to chat_rooms table
ALTER TABLE chat_rooms ADD COLUMN room_code VARCHAR(6) UNIQUE;

-- Update existing rooms with random room codes (if any exist)
UPDATE chat_rooms 
SET room_code = UPPER(SUBSTR(MD5(RANDOM()::text), 1, 6))
WHERE room_code IS NULL;

-- Make room_code required for new entries
ALTER TABLE chat_rooms ALTER COLUMN room_code SET NOT NULL;

-- Create index for faster room code lookups
CREATE INDEX IF NOT EXISTS idx_chat_rooms_room_code ON chat_rooms(room_code);

-- Add file attachment support to messages table
ALTER TABLE messages ADD COLUMN file_name VARCHAR(255);
ALTER TABLE messages ADD COLUMN file_size INTEGER;
ALTER TABLE messages ADD COLUMN file_type VARCHAR(100);
ALTER TABLE messages ADD COLUMN file_url TEXT;
ALTER TABLE messages ADD COLUMN message_type VARCHAR(20) DEFAULT 'text';

-- Add enhanced file features
ALTER TABLE messages ADD COLUMN preview_url TEXT;
ALTER TABLE messages ADD COLUMN is_encrypted BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN file_category VARCHAR(50);
ALTER TABLE messages ADD COLUMN supports_inline_view BOOLEAN DEFAULT FALSE;

-- Create index for file searches
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_file_category ON messages(file_category);

-- Update message content to be optional (for file-only messages)
ALTER TABLE messages ALTER COLUMN content DROP NOT NULL; 

-- =================
-- CALL SYSTEM TABLES
-- =================

-- Call sessions table
CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agora_channel_name VARCHAR(255) NOT NULL UNIQUE,
  agora_app_id VARCHAR(255) NOT NULL,
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  call_type VARCHAR(20) NOT NULL CHECK (call_type IN ('voice', 'video', 'screen_share')),
  max_participants INTEGER DEFAULT 8,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  recording_enabled BOOLEAN DEFAULT FALSE,
  encryption_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call participants table
CREATE TABLE IF NOT EXISTS call_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agora_uid INTEGER NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  is_muted BOOLEAN DEFAULT FALSE,
  is_video_enabled BOOLEAN DEFAULT TRUE,
  is_screen_sharing BOOLEAN DEFAULT FALSE,
  connection_quality VARCHAR(20) DEFAULT 'unknown',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(call_session_id, user_id)
);

-- Call events table (for debugging and analytics)
CREATE TABLE IF NOT EXISTS call_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call invitations table
CREATE TABLE IF NOT EXISTS call_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'missed', 'cancelled')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '2 minutes'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(call_session_id, invitee_id)
);

-- Create indexes for call system
CREATE INDEX IF NOT EXISTS idx_call_sessions_room_id ON call_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_channel_name ON call_sessions(agora_channel_name);
CREATE INDEX IF NOT EXISTS idx_call_participants_session_id ON call_participants(call_session_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user_id ON call_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_call_events_session_id ON call_events(call_session_id);
CREATE INDEX IF NOT EXISTS idx_call_events_type ON call_events(event_type);
CREATE INDEX IF NOT EXISTS idx_call_invitations_invitee_id ON call_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_call_invitations_status ON call_invitations(status);

-- Add call notification support to messages table
ALTER TABLE messages ADD COLUMN call_session_id UUID REFERENCES call_sessions(id) ON DELETE SET NULL;

-- Update function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_call_sessions_updated_at BEFORE UPDATE ON call_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_call_participants_updated_at BEFORE UPDATE ON call_participants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_call_invitations_updated_at BEFORE UPDATE ON call_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 