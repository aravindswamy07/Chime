const express = require('express');
const conversationController = require('../controllers/conversationController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(authenticateToken);

// ========================================
// CONVERSATION ROUTES
// ========================================

// Get all conversations for the current user
router.get('/', conversationController.getUserConversations);

// Create a new conversation
router.post('/', conversationController.createConversation);

// Get a specific conversation
router.get('/:conversationId', conversationController.getConversation);

// ========================================
// MESSAGE ROUTES
// ========================================

// Get messages for a conversation
router.get('/:conversationId/messages', conversationController.getConversationMessages);

// Send a message to a conversation
router.post('/:conversationId/messages', conversationController.sendMessage);

// Edit a message
router.put('/:conversationId/messages/:messageId', conversationController.editMessage);

// Delete a message
router.delete('/:conversationId/messages/:messageId', conversationController.deleteMessage);

// Search messages in conversation
router.get('/:conversationId/messages/search', conversationController.searchMessages);

// ========================================
// PARTICIPANT ROUTES
// ========================================

// Add participant to conversation
router.post('/:conversationId/participants', conversationController.addParticipant);

// Remove participant from conversation
router.delete('/:conversationId/participants', conversationController.removeParticipant);

module.exports = router; 