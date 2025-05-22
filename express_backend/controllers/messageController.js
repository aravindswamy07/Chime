const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');

// Controller for messages
const messageController = {
  // Get messages for a specific chat room
  async getRoomMessages(req, res) {
    try {
      const roomId = req.params.roomId;
      
      // Check if room exists
      const room = await ChatRoom.getById(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }
      
      // Get messages
      const messages = await Message.getByRoomId(roomId);
      
      return res.status(200).json({
        success: true,
        data: messages
      });
    } catch (error) {
      console.error('Get room messages error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Create a new message
  async sendMessage(req, res) {
    try {
      const roomId = req.params.roomId;
      const senderId = req.user.id; // From auth middleware
      const { content } = req.body;
      
      // Validate input
      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Message content cannot be empty'
        });
      }
      
      // Check if room exists
      const room = await ChatRoom.getById(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }
      
      // Create message
      const message = await Message.create({
        roomId,
        senderId,
        content
      });
      
      if (!message) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send message'
        });
      }
      
      return res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message
      });
    } catch (error) {
      console.error('Send message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Get recent messages for a room (with pagination)
  async getRecentMessages(req, res) {
    try {
      const roomId = req.params.roomId;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      
      // Check if room exists
      const room = await ChatRoom.getById(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }
      
      // Get recent messages
      const messages = await Message.getRecentByRoomId(roomId, limit, offset);
      
      return res.status(200).json({
        success: true,
        data: messages
      });
    } catch (error) {
      console.error('Get recent messages error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
};

module.exports = messageController; 