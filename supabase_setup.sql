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

-- Create index for file searches
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);

-- Update message content to be optional (for file-only messages)
ALTER TABLE messages ALTER COLUMN content DROP NOT NULL; 