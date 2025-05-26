const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(authenticateToken);

// ========================================
// USER ROUTES
// ========================================

// Search users
router.get('/search', userController.searchUsers);

// Update current user's profile
router.put('/profile', userController.updateProfile);

// Get user profile (must come last due to :userId parameter)
router.get('/:userId', userController.getUserProfile);

module.exports = router; 