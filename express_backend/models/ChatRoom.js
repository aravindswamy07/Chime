const supabase = require('../config/db');

// ChatRoom Model - interacts with Supabase
class ChatRoom {
  // Generate a simple room code (6 characters)
  static generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  // Get all chat rooms (without sensitive data like room codes)
  static async getAll() {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('id, name, description, max_members, created_at, users:admin_id(username)');
    
    if (error) {
      console.error('Error getting chat rooms:', error);
      return [];
    }
    
    return data;
  }
  
  // Get chat room by ID
  static async getById(id) {
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*, users:admin_id(username)')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error getting chat room by id:', error);
      return null;
    }
    
    return data;
  }

  // Get chat room by room code
  static async getByRoomCode(roomCode) {
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*, users:admin_id(username)')
      .eq('room_code', roomCode.toUpperCase())
      .single();
    
    if (error) {
      console.error('Error getting chat room by room code:', error);
      return null;
    }
    
    return data;
  }
  
  // Create a new chat room
  static async create(roomData) {
    if (!supabase) return null;
    
    const roomCode = this.generateRoomCode();
    
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert([
        {
          name: roomData.name,
          description: roomData.description,
          admin_id: roomData.adminId,
          max_members: roomData.maxMembers || 10,
          room_code: roomCode
        }
      ])
      .select();
    
    if (error) {
      console.error('Error creating chat room:', error);
      return null;
    }
    
    return data[0];
  }
  
  // Get chat room members
  static async getMembers(roomId) {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('room_members')
      .select('users(*)')
      .eq('room_id', roomId);
    
    if (error) {
      console.error('Error getting room members:', error);
      return [];
    }
    
    // Extract user data from the nested structure
    return data.map(item => item.users);
  }

  // Check if user is already a member of the room
  static async isMember(roomId, userId) {
    if (!supabase) return false;
    
    const { data, error } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      // If error is "no rows returned", user is not a member
      return false;
    }
    
    return !!data;
  }
  
  // Add member to chat room
  static async addMember(roomId, userId) {
    if (!supabase) return false;
    
    // First check if user is already a member
    const alreadyMember = await this.isMember(roomId, userId);
    if (alreadyMember) {
      return { success: true, message: 'You are already a member of this room', isAlreadyMember: true };
    }
    
    // Check if the room exists and is not full
    const room = await this.getById(roomId);
    const members = await this.getMembers(roomId);
    
    if (!room) {
      return { success: false, message: 'Room not found' };
    }
    
    if (members.length >= room.max_members) {
      return { success: false, message: 'Room is full' };
    }
    
    // Add member to room
    const { error } = await supabase
      .from('room_members')
      .insert([
        {
          room_id: roomId,
          user_id: userId,
          joined_at: new Date().toISOString()
        }
      ]);
    
    if (error) {
      console.error('Error adding member to room:', error);
      return { success: false, message: 'Failed to add member to room' };
    }
    
    return { success: true, message: 'Successfully joined the room' };
  }
  
  // Join room by room code
  static async joinByRoomCode(roomCode, userId) {
    if (!supabase) return { success: false, message: 'Database connection error' };
    
    // Find room by code
    const room = await this.getByRoomCode(roomCode);
    if (!room) {
      return { success: false, message: 'Invalid room code' };
    }
    
    // Use existing addMember logic
    const result = await this.addMember(room.id, userId);
    
    if (result.success) {
      return { 
        success: true, 
        message: result.message, 
        roomId: room.id,
        isAlreadyMember: result.isAlreadyMember 
      };
    }
    
    return result;
  }
  
  // Remove member from chat room
  static async removeMember(roomId, userId) {
    if (!supabase) return false;
    
    const { error } = await supabase
      .from('room_members')
      .delete()
      .match({ room_id: roomId, user_id: userId });
    
    if (error) {
      console.error('Error removing member from room:', error);
      return false;
    }
    
    return true;
  }
}

module.exports = ChatRoom; 