const ChatRoom = require('../models/ChatRoom');

// Controller for chat rooms
const chatRoomController = {
  // Get all chat rooms
  async getAllRooms(req, res) {
    try {
      const rooms = await ChatRoom.getAll();
      
      return res.status(200).json({
        success: true,
        data: rooms
      });
    } catch (error) {
      console.error('Get all rooms error:', error);
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
      
      const room = await ChatRoom.getById(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }
      
      // Get members for the room
      const members = await ChatRoom.getMembers(roomId);
      
      return res.status(200).json({
        success: true,
        data: {
          ...room,
          members
        }
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
        data: room
      });
    } catch (error) {
      console.error('Create room error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Join a chat room
  async joinRoom(req, res) {
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
      
      // Add user to room
      const result = await ChatRoom.addMember(roomId, userId);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Joined room successfully'
      });
    } catch (error) {
      console.error('Join room error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
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
          message: 'Admin cannot leave the room. Transfer ownership first or delete the room.'
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
  }
};

module.exports = chatRoomController; 