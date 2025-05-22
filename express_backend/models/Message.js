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
    
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          room_id: messageData.roomId,
          sender_id: messageData.senderId,
          content: messageData.content,
          created_at: new Date().toISOString()
        }
      ])
      .select();
    
    if (error) {
      console.error('Error creating message:', error);
      return null;
    }
    
    return data[0];
  }
  
  // Get recent messages for a room (with pagination)
  static async getRecentByRoomId(roomId, limit = 50, offset = 0) {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('messages')
      .select('*, users:sender_id(username)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error getting recent messages:', error);
      return [];
    }
    
    // Return in chronological order
    return data.reverse();
  }
  
  // Subscribe to new messages in a room
  // Note: This will be implemented in the frontend using Supabase Realtime
  // Supabase Realtime is a WebSocket-based API for receiving real-time updates
}

module.exports = Message; 