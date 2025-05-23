const express = require('express');
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../config/fileUpload');

const router = express.Router();

// All routes are protected
router.use(authenticateToken);

// Message routes
router.get('/rooms/:roomId/messages', messageController.getRoomMessages);
router.get('/rooms/:roomId/messages/recent', messageController.getRecentMessages);
router.post('/rooms/:roomId/messages', messageController.sendMessage);

// Upload file message
router.post('/rooms/:roomId/upload', upload.single('file'), messageController.uploadFile);

module.exports = router; 