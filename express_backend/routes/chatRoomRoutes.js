const express = require('express');
const router = express.Router();
const chatRoomController = require('../controllers/chatRoomController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get rooms that user is a member of
router.get('/', chatRoomController.getAllRooms);

// Create a new chat room
router.post('/', chatRoomController.createRoom);

// Join room by room code (primary way to join rooms)
router.post('/join', chatRoomController.joinRoomByCode);

// Get specific chat room (only if user is a member)
router.get('/:id', chatRoomController.getRoomById);

// Leave a chat room
router.post('/:id/leave', chatRoomController.leaveRoom);

// Remove user from chat room (admin only)
router.delete('/:roomId/users/:userId', chatRoomController.removeUser);

// Delete a chat room (admin only)
router.delete('/:id', chatRoomController.deleteRoom);

module.exports = router; 