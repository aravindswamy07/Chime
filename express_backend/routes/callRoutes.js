const express = require('express');
const callController = require('../controllers/callController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(authenticateToken);

// ========================================
// CALL MANAGEMENT ROUTES
// ========================================

// Initiate a new call in a room
router.post('/rooms/:roomId/call/initiate', callController.initiateCall);

// Join an existing call
router.post('/call/:sessionId/join', callController.joinCall);

// Leave a call
router.post('/call/:sessionId/leave', callController.leaveCall);

// End a call (admin/initiator only)
router.post('/call/:sessionId/end', callController.endCall);

// Get call status and participants
router.get('/call/:sessionId/status', callController.getCallStatus);

// Update participant status (mute, video, etc.)
router.patch('/call/:sessionId/participant', callController.updateParticipantStatus);

// Get active call for a room
router.get('/rooms/:roomId/call/active', callController.getActiveCallForRoom);

// Get call history for a room
router.get('/rooms/:roomId/call/history', callController.getCallHistory);

// Refresh Agora token
router.post('/call/:sessionId/refresh-token', callController.refreshToken);

module.exports = router; 