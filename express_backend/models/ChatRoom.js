const supabase = require('../config/db');

// ChatRoom Model - interacts with Supabase
class ChatRoom {
  // Generate a simple room code (6 characters)
  static generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  // Get rooms that the user is a member of (instead of all rooms)
  static async getUserRooms(userId) {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('room_members')
      .select(`
        chat_rooms:room_id (
          id,
          name,
          description,
          max_members,
          created_at,
          admin_id,
          users:admin_id(username)
        )
      `)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error getting user rooms:', error);
      return [];
    }
    
    // Extract room data and add member count
    const rooms = data.map(item => item.chat_rooms).filter(room => room !== null);
    
    // Add current member count for each room
    for (let room of rooms) {
      const memberCount = await this.getMemberCount(room.id);
      room.current_members = memberCount;
    }
    
    return rooms;
  }

  // Get member count for a room
  static async getMemberCount(roomId) {
    if (!supabase) return 0;
    
    const { count, error } = await supabase
      .from('room_members')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId);
    
    if (error) {
      console.error('Error getting member count:', error);
      return 0;
    }
    
    return count || 0;
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
  
  // Join room by room code (this is the primary way to join rooms now)
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
        roomName: room.name,
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

  // Delete a chat room (admin only) - cascades deletion of all related data
  static async delete(roomId, adminId) {
    if (!supabase) return { success: false, message: 'Database connection error' };
    
    try {
      console.log(`Attempting to delete room ${roomId} by admin ${adminId}`);
      
      // First verify the room exists and user is admin
      const room = await this.getById(roomId);
      if (!room) {
        return { success: false, message: 'Room not found' };
      }
      
      if (room.admin_id !== adminId) {
        return { success: false, message: 'Only room admin can delete the room' };
      }
      
      // Step 1: Delete all messages in the room
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('room_id', roomId);
      
      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
        return { success: false, message: 'Failed to delete room messages' };
      }
      
      console.log(`Deleted messages for room ${roomId}`);
      
      // Step 2: Delete all room members
      const { error: membersError } = await supabase
        .from('room_members')
        .delete()
        .eq('room_id', roomId);
      
      if (membersError) {
        console.error('Error deleting room members:', membersError);
        return { success: false, message: 'Failed to delete room members' };
      }
      
      console.log(`Deleted room members for room ${roomId}`);
      
      // Step 3: Delete the room itself
      const { error: roomError } = await supabase
        .from('chat_rooms')
        .delete()
        .eq('id', roomId);
      
      if (roomError) {
        console.error('Error deleting room:', roomError);
        return { success: false, message: 'Failed to delete room' };
      }
      
      console.log(`Successfully deleted room ${roomId}`);
      
      return { success: true, message: 'Room deleted successfully' };
      
    } catch (error) {
      console.error('Exception during room deletion:', error);
      return { success: false, message: 'Server error during deletion' };
    }
  }
}

module.exports = ChatRoom; 