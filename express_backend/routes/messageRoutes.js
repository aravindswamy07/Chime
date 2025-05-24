const express = require('express');
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');
const { upload, chunkUpload } = require('../config/fileUpload');

const router = express.Router();

// All routes are protected
router.use(authenticateToken);

// Message routes
router.get('/rooms/:roomId/messages', messageController.getRoomMessages);
router.get('/rooms/:roomId/messages/recent', messageController.getRecentMessages);
router.post('/rooms/:roomId/messages', messageController.sendMessage);

// File upload routes
router.post('/rooms/:roomId/upload', upload.single('file'), messageController.uploadFile);

// Chunked upload routes
router.post('/rooms/:roomId/upload/session', messageController.createUploadSession);
router.post('/rooms/:roomId/upload/chunk', chunkUpload.single('chunk'), messageController.uploadChunk);
router.post('/rooms/:roomId/upload/finalize', messageController.finalizeUpload);

module.exports = router; 