const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(authenticateToken);

// ========================================
// FRIENDS ROUTES
// ========================================

// Get user's friends
router.get('/', userController.getFriends);

module.exports = router; 