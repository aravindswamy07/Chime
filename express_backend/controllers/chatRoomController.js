const ChatRoom = require('../models/ChatRoom');

// Controller for chat rooms
const chatRoomController = {
  // Get rooms that the user is a member of
  async getAllRooms(req, res) {
    try {
      const userId = req.user.id; // From auth middleware
      const rooms = await ChatRoom.getUserRooms(userId);
      
      return res.status(200).json({
        success: true,
        data: rooms
      });
    } catch (error) {
      console.error('Get user rooms error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Get a specific chat room
  async getRoomById(req, res) {
    try {
      const roomId = req.params.id;
      const userId = req.user.id; // From auth middleware
      
      // First check if user is a member of the room
      const isMember = await ChatRoom.isMember(roomId, userId);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not a member of this room.'
        });
      }
      
      const room = await ChatRoom.getById(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }
      
      // Get members for the room
      const members = await ChatRoom.getMembers(roomId);
      
      // Only show room code to admin
      const roomData = {
        ...room,
        members
      };
      
      // Include room code only if user is admin
      if (room.admin_id === userId) {
        roomData.room_code = room.room_code;
      } else {
        // Remove room code for non-admin users
        delete roomData.room_code;
      }
      
      return res.status(200).json({
        success: true,
        data: roomData
      });
    } catch (error) {
      console.error('Get room by id error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Create a new chat room
  async createRoom(req, res) {
    try {
      const { name, description, maxMembers } = req.body;
      const adminId = req.user.id; // From auth middleware
      
      // Validate input
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Please provide room name'
        });
      }
      
      // Create room
      const room = await ChatRoom.create({
        name,
        description,
        adminId,
        maxMembers: maxMembers || 10
      });
      
      if (!room) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create room'
        });
      }
      
      // Add admin as first member
      await ChatRoom.addMember(room.id, adminId);
      
      return res.status(201).json({
        success: true,
        message: 'Room created successfully',
        data: {
          ...room,
          roomId: room.id,
          roomCode: room.room_code
        }
      });
    } catch (error) {
      console.error('Create room error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Join room by room code
  async joinRoomByCode(req, res) {
    try {
      const { roomCode } = req.body;
      const userId = req.user.id; // From auth middleware
      
      // Validate input
      if (!roomCode) {
        return res.status(400).json({
          success: false,
          message: 'Please provide room code'
        });
      }
      
      // Join room by code
      const result = await ChatRoom.joinByRoomCode(roomCode, userId);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }
      
      // If user was already a member, still return success but with different message
      if (result.isAlreadyMember) {
        return res.status(200).json({
          success: true,
          message: 'You are already a member of this room',
          roomId: result.roomId,
          roomName: result.roomName,
          alreadyMember: true
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Successfully joined the room',
        roomId: result.roomId,
        roomName: result.roomName
      });
    } catch (error) {
      console.error('Join room by code error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Join a chat room (disabled - users can only join via room code now)
  async joinRoom(req, res) {
    return res.status(403).json({
      success: false,
      message: 'Direct room joining is disabled. Please use room code to join.'
    });
  },
  
  // Leave a chat room
  async leaveRoom(req, res) {
    try {
      const roomId = req.params.id;
      const userId = req.user.id; // From auth middleware
      
      const room = await ChatRoom.getById(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }
      
      // Check if user is the admin
      if (room.admin_id === userId) {
        return res.status(400).json({
          success: false,
          message: 'Admin cannot leave the room. Please delete the room instead if you want to remove it permanently.'
        });
      }
      
      // Remove user from room
      const success = await ChatRoom.removeMember(roomId, userId);
      
      if (!success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to leave room'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Left room successfully'
      });
    } catch (error) {
      console.error('Leave room error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Remove a user from a chat room (admin only)
  async removeUser(req, res) {
    try {
      const roomId = req.params.roomId;
      const userToRemoveId = req.params.userId;
      const adminId = req.user.id; // From auth middleware
      
      const room = await ChatRoom.getById(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }
      
      // Check if requester is admin
      if (room.admin_id !== adminId) {
        return res.status(403).json({
          success: false,
          message: 'Only admin can remove users'
        });
      }
      
      // Remove user from room
      const success = await ChatRoom.removeMember(roomId, userToRemoveId);
      
      if (!success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to remove user'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'User removed successfully'
      });
    } catch (error) {
      console.error('Remove user error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Delete a chat room (admin only)
  async deleteRoom(req, res) {
    try {
      const roomId = req.params.id;
      const adminId = req.user.id; // From auth middleware
      
      console.log(`Delete room request: roomId=${roomId}, adminId=${adminId}`);
      
      // Delete the room using the model method
      const result = await ChatRoom.delete(roomId, adminId);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }
      
      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete room error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
};

module.exports = chatRoomController; 