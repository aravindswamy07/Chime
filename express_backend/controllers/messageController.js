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
      const userId = req.user.id; // From auth middleware
      const { content } = req.body;
      
      console.log(`User ${userId} sending message to room ${roomId}: "${content}" (length: ${content?.length})`);
      
      // Validate input
      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message content is required'
        });
      }
      
      if (content.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Message is too long (max 1000 characters)'
        });
      }
      
      // Check if room exists and user is a member
      const room = await ChatRoom.getById(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }
      
      // Verify user is a member of the room
      const isMember = await ChatRoom.isMember(roomId, userId);
      if (!isMember) {
        console.log(`User ${userId} is not a member of room ${roomId}`);
        return res.status(403).json({
          success: false,
          message: 'You must be a member of the room to send messages'
        });
      }
      
      // Create message
      const message = await Message.create({
        roomId,
        senderId: userId,
        content: content.trim()
      });
      
      if (!message) {
        console.error('Failed to create message in database');
        return res.status(500).json({
          success: false,
          message: 'Failed to send message'
        });
      }
      
      console.log(`Message created successfully with ID: ${message.id}, content: "${message.content}"`);
      
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
      const userId = req.user.id; // From auth middleware
      
      console.log(`Fetching messages for room ${roomId}, user ${userId}`);
      
      const messages = await Message.getRecentByRoomId(roomId, 50); // Get last 50 messages
      
      console.log(`Found ${messages.length} messages for room ${roomId}`);
      
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