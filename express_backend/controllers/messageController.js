const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const { getFileCategory, formatFileSize, uploadToSupabase, supportsInlineViewing } = require('../config/fileUpload');

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
  },

  // Upload file and send as message
  async uploadFile(req, res) {
    try {
      const roomId = req.params.roomId;
      const userId = req.user.id;
      const { caption, encrypt } = req.body; // Optional caption and encryption flag
      
      console.log(`User ${userId} uploading file to room ${roomId}`);
      
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
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
      
      const isMember = await ChatRoom.isMember(roomId, userId);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'You must be a member of the room to upload files'
        });
      }
      
      const file = req.file;
      
      console.log(`Processing file: ${file.originalname} (${formatFileSize(file.size)})`);
      
      // Upload file to Supabase Storage with security options
      const uploadOptions = {
        encrypt: encrypt === 'true' || encrypt === true
      };
      
      const uploadResult = await uploadToSupabase(file, roomId, uploadOptions);
      
      // Determine if file supports inline viewing
      const supportsInline = supportsInlineViewing(file.mimetype);
      
      // Create message with enhanced file attachment data
      const message = await Message.create({
        roomId,
        senderId: userId,
        content: caption || null,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
        fileUrl: uploadResult.publicUrl,
        previewUrl: uploadResult.previewUrl,
        isEncrypted: uploadResult.isEncrypted,
        fileCategory: uploadResult.fileCategory,
        supportsInlineView: supportsInline,
        messageType: 'file'
      });
      
      if (!message) {
        return res.status(500).json({
          success: false,
          message: 'Failed to save file message'
        });
      }
      
      console.log(`Enhanced file message created with ID: ${message.id}`);
      
      return res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          ...message,
          fileCategory: uploadResult.fileCategory,
          formattedSize: formatFileSize(file.size),
          supportsInlineView: supportsInline,
          hasPreview: !!uploadResult.previewUrl
        }
      });
      
    } catch (error) {
      console.error('Upload file error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Server error during file upload'
      });
    }
  }
};

module.exports = messageController; 