const supabase = require('../config/db');

// Message Model - interacts with Supabase
class Message {
  // Get messages for a specific chat room
  static async getByRoomId(roomId) {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('messages')
      .select('*, users:sender_id(username)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error getting messages:', error);
      return [];
    }
    
    return data;
  }
  
  // Create a new message
  static async create(messageData) {
    if (!supabase) return null;
    
    try {
      const insertData = {
        room_id: messageData.roomId,
        sender_id: messageData.senderId,
        created_at: new Date().toISOString(),
        message_type: messageData.messageType || 'text'
      };

      // Add content if provided (text messages or file with caption)
      if (messageData.content) {
        insertData.content = messageData.content;
      }

      // Add file data if provided
      if (messageData.fileName) {
        insertData.file_name = messageData.fileName;
        insertData.file_size = messageData.fileSize;
        insertData.file_type = messageData.fileType;
        insertData.file_url = messageData.fileUrl;
        insertData.message_type = 'file';
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([insertData])
        .select('*, users:sender_id(username)')
        .single();
      
      if (error) {
        console.error('Error creating message:', error);
        return null;
      }
      
      console.log('Message created in database:', data);
      return data;
    } catch (err) {
      console.error('Exception creating message:', err);
      return null;
    }
  }
  
  // Get recent messages for a room (with proper ordering)
  static async getRecentByRoomId(roomId, limit = 50) {
    if (!supabase) return [];
    
    try {
      console.log(`Fetching recent messages for room ${roomId}, limit: ${limit}`);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*, users:sender_id(username)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true }) // Secondary sort by ID for consistency
        .limit(limit);
      
      if (error) {
        console.error('Error getting recent messages:', error);
        return [];
      }
      
      console.log(`Retrieved ${data.length} messages for room ${roomId}`);
      console.log('Latest message IDs:', data.slice(-3).map(m => m.id));
      
      return data || [];
    } catch (err) {
      console.error('Exception getting recent messages:', err);
      return [];
    }
  }
  
  // Get messages newer than a specific message ID
  static async getMessagesAfter(roomId, messageId, limit = 20) {
    if (!supabase) return [];
    
    try {
      console.log(`Fetching messages after ID ${messageId} for room ${roomId}`);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*, users:sender_id(username)')
        .eq('room_id', roomId)
        .gt('id', messageId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(limit);
      
      if (error) {
        console.error('Error getting messages after ID:', error);
        return [];
      }
      
      console.log(`Found ${data.length} new messages after ID ${messageId}`);
      return data || [];
    } catch (err) {
      console.error('Exception getting messages after ID:', err);
      return [];
    }
  }
  
  // Subscribe to new messages in a room
  // Note: This will be implemented in the frontend using Supabase Realtime
  // Supabase Realtime is a WebSocket-based API for receiving real-time updates
}

module.exports = Message; 