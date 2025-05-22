const supabase = require('../config/db');

// ChatRoom Model - interacts with Supabase
class ChatRoom {
  // Get all chat rooms
  static async getAll() {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*, users:admin_id(username)');
    
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
  
  // Create a new chat room
  static async create(roomData) {
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert([
        {
          name: roomData.name,
          description: roomData.description,
          admin_id: roomData.adminId,
          max_members: roomData.maxMembers || 10
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