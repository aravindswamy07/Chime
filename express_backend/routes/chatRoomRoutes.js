const express = require('express');
const chatRoomController = require('../controllers/chatRoomController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(authenticateToken);

// Room routes
router.get('/', chatRoomController.getAllRooms);
router.get('/:id', chatRoomController.getRoomById);
router.post('/', chatRoomController.createRoom);
router.post('/:id/join', chatRoomController.joinRoom);
router.post('/:id/leave', chatRoomController.leaveRoom);
router.delete('/:roomId/users/:userId', chatRoomController.removeUser);

module.exports = router; 