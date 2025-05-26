const User = require('../models/User');
const supabase = require('../config/db');

const userController = {
  // Get user's friends
  async getFriends(req, res) {
    try {
      const userId = req.user.id;
      
      // For now, we'll return all users except the current user as potential "friends"
      // In a real application, you'd have a friends table with friend requests, etc.
      const { data: users, error } = await supabase
        .from('users')
        .select('id, username, email, avatar_url, created_at')
        .neq('id', userId)
        .limit(50);

      if (error) {
        throw error;
      }

      // Add mock status for demo purposes
      const friendsWithStatus = users.map(user => ({
        ...user,
        status: Math.random() > 0.5 ? 'online' : 'offline'
      }));

      return res.status(200).json({
        success: true,
        data: friendsWithStatus
      });
    } catch (error) {
      console.error('Error getting friends:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get friends'
      });
    }
  },

  // Search users
  async searchUsers(req, res) {
    try {
      const { query } = req.query;
      const userId = req.user.id;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const { data: users, error } = await supabase
        .from('users')
        .select('id, username, email, avatar_url, created_at')
        .neq('id', userId)
        .ilike('username', `%${query}%`)
        .limit(20);

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Error searching users:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to search users'
      });
    }
  },

  // Get user profile
  async getUserProfile(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.getById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Remove sensitive information
      const { password, ...userProfile } = user;

      return res.status(200).json({
        success: true,
        data: userProfile
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }
  },

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { username, email, avatar_url } = req.body;

      const updateData = {};
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      if (avatar_url) updateData.avatar_url = avatar_url;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select('id, username, email, avatar_url, created_at')
        .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }
};

module.exports = userController; 