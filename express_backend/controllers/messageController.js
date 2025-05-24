const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const { getFileCategory, formatFileSize, uploadToSupabase, supportsInlineViewing } = require('../config/fileUpload');
const supabase = require('../config/db');

// Store for upload sessions (in production, use Redis or database)
const uploadSessions = new Map();
const uploadChunks = new Map();

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
  },

  // Create upload session for chunked uploads
  async createUploadSession(req, res) {
    try {
      const { sessionId, fileName, fileSize, fileType, totalChunks, chunkSize, caption, encrypt } = req.body;
      const { roomId } = req.params;
      const userId = req.user.id;

      console.log(`Creating upload session: ${sessionId} for ${fileName} (${fileSize} bytes, ${totalChunks} chunks)`);

      // Validate session data
      if (!sessionId || !fileName || !fileSize || !totalChunks) {
        return res.status(400).json({
          success: false,
          message: 'Missing required session parameters'
        });
      }

      // Check if user has access to room
      const roomCheck = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (roomCheck.error && roomCheck.error.code !== 'PGRST116') {
        return res.status(500).json({
          success: false,
          message: 'Database error checking room access'
        });
      }

      if (!roomCheck.data) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this room'
        });
      }

      // Create session
      const session = {
        sessionId,
        roomId,
        userId,
        fileName,
        fileSize,
        fileType,
        totalChunks,
        chunkSize,
        caption,
        encrypt,
        createdAt: new Date(),
        receivedChunks: new Set(),
        status: 'active'
      };

      uploadSessions.set(sessionId, session);
      uploadChunks.set(sessionId, new Map());

      res.json({
        success: true,
        data: {
          sessionId,
          totalChunks,
          chunkSize
        }
      });

    } catch (error) {
      console.error('Error creating upload session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create upload session'
      });
    }
  },

  // Upload chunk
  async uploadChunk(req, res) {
    try {
      const { sessionId, chunkIndex, totalChunks } = req.body;
      const chunk = req.file;
      const { roomId } = req.params;

      if (!chunk || !sessionId || chunkIndex === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing chunk data or session ID'
        });
      }

      const session = uploadSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Upload session not found'
        });
      }

      if (session.roomId !== roomId) {
        return res.status(403).json({
          success: false,
          message: 'Session room mismatch'
        });
      }

      const chunkIndexNum = parseInt(chunkIndex);
      console.log(`Received chunk ${chunkIndexNum + 1}/${session.totalChunks} for session ${sessionId}`);

      // Store chunk
      const chunks = uploadChunks.get(sessionId);
      chunks.set(chunkIndexNum, chunk.buffer);
      session.receivedChunks.add(chunkIndexNum);

      // Clean up old sessions (older than 1 hour)
      cleanupOldSessions();

      res.json({
        success: true,
        data: {
          chunkIndex: chunkIndexNum,
          received: session.receivedChunks.size,
          total: session.totalChunks
        }
      });

    } catch (error) {
      console.error('Error uploading chunk:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload chunk'
      });
    }
  },

  // Finalize chunked upload
  async finalizeUpload(req, res) {
    try {
      const { sessionId } = req.body;
      const { roomId } = req.params;

      const session = uploadSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Upload session not found'
        });
      }

      if (session.roomId !== roomId) {
        return res.status(403).json({
          success: false,
          message: 'Session room mismatch'
        });
      }

      // Check if all chunks received
      if (session.receivedChunks.size !== session.totalChunks) {
        return res.status(400).json({
          success: false,
          message: `Missing chunks: received ${session.receivedChunks.size}/${session.totalChunks}`
        });
      }

      console.log(`Finalizing upload for session ${sessionId}: ${session.fileName}`);

      // Reassemble file from chunks
      const chunks = uploadChunks.get(sessionId);
      const sortedChunks = [];
      
      for (let i = 0; i < session.totalChunks; i++) {
        const chunk = chunks.get(i);
        if (!chunk) {
          throw new Error(`Missing chunk ${i}`);
        }
        sortedChunks.push(chunk);
      }

      const completeFile = Buffer.concat(sortedChunks);
      console.log(`Reassembled file: ${completeFile.length} bytes`);

      // Create a file object compatible with existing upload logic
      const fileObject = {
        originalname: session.fileName,
        buffer: completeFile,
        size: completeFile.length,
        mimetype: session.fileType,
        fileConfig: getFileConfigForType(session.fileType)
      };

      // Use existing upload logic
      const uploadResult = await uploadToSupabase(fileObject, roomId, {
        encrypt: session.encrypt
      });

      // Create message record
      const messageData = {
        room_id: roomId,
        sender_id: session.userId,
        content: session.caption || null,
        message_type: 'file',
        file_name: session.fileName,
        file_size: session.fileSize,
        file_type: session.fileType,
        file_url: uploadResult.publicUrl,
        preview_url: uploadResult.previewUrl,
        is_encrypted: uploadResult.isEncrypted,
        file_category: uploadResult.fileCategory,
        supports_inline_view: uploadResult.needsPreview
      };

      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          users:sender_id (
            id,
            username
          )
        `)
        .single();

      if (messageError) {
        console.error('Error creating message:', messageError);
        throw messageError;
      }

      // Cleanup session
      uploadSessions.delete(sessionId);
      uploadChunks.delete(sessionId);

      console.log(`Upload completed successfully: ${session.fileName}`);

      res.json({
        success: true,
        message: 'File uploaded successfully',
        data: message
      });

    } catch (error) {
      console.error('Error finalizing upload:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to finalize upload'
      });
    }
  }
};

// Helper function to get file config for a file type
function getFileConfigForType(mimeType) {
  const allowedTypes = {
    'image/jpeg': { maxSize: 120 * 1024 * 1024, needsPreview: true },
    'image/jpg': { maxSize: 120 * 1024 * 1024, needsPreview: true },
    'image/png': { maxSize: 120 * 1024 * 1024, needsPreview: true },
    'image/gif': { maxSize: 120 * 1024 * 1024, needsPreview: true },
    'image/webp': { maxSize: 120 * 1024 * 1024, needsPreview: true },
    'application/pdf': { maxSize: 120 * 1024 * 1024, needsPreview: true },
    'application/msword': { maxSize: 120 * 1024 * 1024, needsPreview: true },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { maxSize: 120 * 1024 * 1024, needsPreview: true },
    'application/vnd.ms-excel': { maxSize: 120 * 1024 * 1024, needsPreview: false },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { maxSize: 120 * 1024 * 1024, needsPreview: false },
    'application/vnd.ms-powerpoint': { maxSize: 120 * 1024 * 1024, needsPreview: false },
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': { maxSize: 120 * 1024 * 1024, needsPreview: false },
    'text/plain': { maxSize: 120 * 1024 * 1024, needsPreview: false },
    'text/csv': { maxSize: 120 * 1024 * 1024, needsPreview: false },
    'application/json': { maxSize: 120 * 1024 * 1024, needsPreview: false },
    'application/zip': { maxSize: 120 * 1024 * 1024, needsPreview: false },
    'application/x-zip-compressed': { maxSize: 120 * 1024 * 1024, needsPreview: false }
  };
  
  return allowedTypes[mimeType] || { maxSize: 120 * 1024 * 1024, needsPreview: false };
}

// Cleanup old sessions (call periodically)
function cleanupOldSessions() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  for (const [sessionId, session] of uploadSessions) {
    if (session.createdAt < oneHourAgo) {
      console.log(`Cleaning up old session: ${sessionId}`);
      uploadSessions.delete(sessionId);
      uploadChunks.delete(sessionId);
    }
  }
}

module.exports = messageController; 