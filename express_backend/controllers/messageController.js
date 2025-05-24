const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const { getFileCategory, formatFileSize, uploadToSupabase, supportsInlineViewing } = require('../config/fileUpload');
const supabase = require('../config/db');

// Temporary in-memory storage for chunks during upload (per-request basis)
const activeChunks = new Map();

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
      
      console.log(`📤 Traditional upload request - User: ${userId}, Room: ${roomId}`);
      console.log(`📋 Request body:`, { caption, encrypt });
      console.log(`📁 File info:`, req.file ? {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : 'No file');
      
      // Check if file was uploaded
      if (!req.file) {
        console.error('❌ No file uploaded in request');
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }
      
      // Check if room exists and user is a member
      console.log(`🔍 Checking room ${roomId} and user ${userId} membership...`);
      const room = await ChatRoom.getById(roomId);
      if (!room) {
        console.error(`❌ Room ${roomId} not found`);
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }
      
      const isMember = await ChatRoom.isMember(roomId, userId);
      if (!isMember) {
        console.error(`❌ User ${userId} is not a member of room ${roomId}`);
        return res.status(403).json({
          success: false,
          message: 'You must be a member of the room to upload files'
        });
      }
      
      const file = req.file;
      
      console.log(`✅ Validation passed. Processing file: ${file.originalname} (${formatFileSize(file.size)})`);
      
      // Upload file to Supabase Storage with security options
      const uploadOptions = {
        encrypt: encrypt === 'true' || encrypt === true
      };
      
      console.log(`📤 Uploading to Supabase with options:`, uploadOptions);
      const uploadResult = await uploadToSupabase(file, roomId, uploadOptions);
      console.log(`✅ Supabase upload successful:`, {
        publicUrl: uploadResult.publicUrl,
        hasPreview: !!uploadResult.previewUrl,
        isEncrypted: uploadResult.isEncrypted
      });
      
      // Determine if file supports inline viewing
      const supportsInline = supportsInlineViewing(file.mimetype);
      
      console.log(`💾 Creating message record...`);
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
        console.error('❌ Failed to create message record');
        return res.status(500).json({
          success: false,
          message: 'Failed to save file message'
        });
      }
      
      console.log(`✅ Traditional upload completed successfully. Message ID: ${message.id}`);
      
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
      console.error('❌ Traditional upload error:', error);
      console.error('❌ Error stack:', error.stack);
      
      // Log additional context
      console.error('❌ Request details:', {
        roomId: req.params.roomId,
        userId: req.user?.id,
        hasFile: !!req.file,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(500).json({
        success: false,
        message: `Server error during file upload: ${error.message}`
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

      // For serverless compatibility, we'll store session info in the response
      // and reconstruct it on each chunk upload
      const sessionData = {
        sessionId,
        roomId,
        userId,
        fileName,
        fileSize,
        fileType,
        totalChunks,
        chunkSize,
        caption: caption || null,
        encrypt: encrypt || false,
        createdAt: new Date().toISOString()
      };

      // Initialize chunks storage for this session
      activeChunks.set(sessionId, new Map());

      res.json({
        success: true,
        data: {
          sessionId,
          totalChunks,
          chunkSize,
          sessionData: Buffer.from(JSON.stringify(sessionData)).toString('base64') // Encode session data
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
      const { sessionId, chunkIndex, totalChunks, sessionData } = req.body;
      const chunk = req.file;
      const { roomId } = req.params;

      if (!chunk || !sessionId || chunkIndex === undefined || !sessionData) {
        return res.status(400).json({
          success: false,
          message: 'Missing chunk data, session ID, or session data'
        });
      }

      // Decode session data
      let session;
      try {
        session = JSON.parse(Buffer.from(sessionData, 'base64').toString());
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid session data'
        });
      }

      // Validate session
      if (session.sessionId !== sessionId || session.roomId !== roomId) {
        return res.status(403).json({
          success: false,
          message: 'Session validation failed'
        });
      }

      const chunkIndexNum = parseInt(chunkIndex);
      console.log(`Received chunk ${chunkIndexNum + 1}/${session.totalChunks} for session ${sessionId}`);

      // Store chunk in memory for this session
      if (!activeChunks.has(sessionId)) {
        activeChunks.set(sessionId, new Map());
      }
      
      const chunks = activeChunks.get(sessionId);
      chunks.set(chunkIndexNum, chunk.buffer);

      res.json({
        success: true,
        data: {
          chunkIndex: chunkIndexNum,
          received: chunks.size,
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
      const { sessionId, sessionData } = req.body;
      const { roomId } = req.params;

      console.log(`🔄 Finalization request received for session: ${sessionId}`);

      if (!sessionId || !sessionData) {
        console.error('❌ Missing session ID or session data in finalization request');
        return res.status(400).json({
          success: false,
          message: 'Missing session ID or session data'
        });
      }

      // Decode session data
      let session;
      try {
        session = JSON.parse(Buffer.from(sessionData, 'base64').toString());
        console.log(`✅ Session data decoded successfully for: ${session.fileName}`);
      } catch (error) {
        console.error('❌ Failed to decode session data:', error);
        return res.status(400).json({
          success: false,
          message: 'Invalid session data'
        });
      }

      // Validate session
      if (session.sessionId !== sessionId || session.roomId !== roomId) {
        console.error(`❌ Session validation failed. Expected: ${sessionId}/${roomId}, Got: ${session.sessionId}/${session.roomId}`);
        return res.status(403).json({
          success: false,
          message: 'Session validation failed'
        });
      }

      console.log(`🔄 Finalizing upload for session ${sessionId}: ${session.fileName} (${session.totalChunks} chunks)`);

      // Get chunks from memory
      const chunks = activeChunks.get(sessionId);
      if (!chunks) {
        console.error(`❌ Chunks not found in memory for session: ${sessionId}`);
        return res.status(400).json({
          success: false,
          message: 'Chunks not found in memory. Upload may have timed out.'
        });
      }

      console.log(`📦 Found ${chunks.size} chunks in memory for session: ${sessionId}`);

      // Check if all chunks received
      if (chunks.size !== session.totalChunks) {
        console.error(`❌ Missing chunks: received ${chunks.size}/${session.totalChunks} for session: ${sessionId}`);
        return res.status(400).json({
          success: false,
          message: `Missing chunks: received ${chunks.size}/${session.totalChunks}`
        });
      }

      // Reassemble file from chunks
      console.log(`🔧 Reassembling ${session.totalChunks} chunks for: ${session.fileName}`);
      const sortedChunks = [];
      for (let i = 0; i < session.totalChunks; i++) {
        const chunk = chunks.get(i);
        if (!chunk) {
          console.error(`❌ Missing chunk ${i} for session: ${sessionId}`);
          throw new Error(`Missing chunk ${i}`);
        }
        sortedChunks.push(chunk);
      }

      const completeFile = Buffer.concat(sortedChunks);
      console.log(`✅ File reassembled successfully: ${completeFile.length} bytes (expected: ${session.fileSize})`);

      // Validate file size
      if (completeFile.length !== session.fileSize) {
        console.error(`❌ File size mismatch: expected ${session.fileSize}, got ${completeFile.length}`);
        throw new Error(`File size mismatch: expected ${session.fileSize}, got ${completeFile.length}`);
      }

      // Create a file object compatible with existing upload logic
      const fileObject = {
        originalname: session.fileName,
        buffer: completeFile,
        size: completeFile.length,
        mimetype: session.fileType,
        fileConfig: getFileConfigForType(session.fileType)
      };

      console.log(`📤 Uploading reassembled file to Supabase: ${session.fileName}`);

      // Use existing upload logic
      const uploadResult = await uploadToSupabase(fileObject, roomId, {
        encrypt: session.encrypt
      });

      console.log(`✅ File uploaded to Supabase successfully: ${uploadResult.publicUrl}`);

      // Create message record
      const message = await Message.create({
        roomId,
        senderId: session.userId,
        content: session.caption || null,
        fileName: session.fileName,
        fileSize: session.fileSize,
        fileType: session.fileType,
        fileUrl: uploadResult.publicUrl,
        previewUrl: uploadResult.previewUrl,
        isEncrypted: uploadResult.isEncrypted,
        fileCategory: uploadResult.fileCategory,
        supportsInlineView: uploadResult.needsPreview,
        messageType: 'file'
      });

      if (!message) {
        console.error(`❌ Failed to create message for session: ${sessionId}`);
        throw new Error('Failed to create message');
      }

      console.log(`✅ Message created successfully with ID: ${message.id}`);

      // Cleanup chunks from memory
      activeChunks.delete(sessionId);
      console.log(`🧹 Cleaned up chunks from memory for session: ${sessionId}`);

      console.log(`🎉 Upload completed successfully: ${session.fileName}`);

      res.json({
        success: true,
        message: 'File uploaded successfully',
        data: message
      });

    } catch (error) {
      console.error('❌ Error finalizing upload:', error);
      res.status(500).json({
        success: false,
        message: `Failed to finalize upload: ${error.message}`
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

module.exports = messageController; 