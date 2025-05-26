const Conversation = require('../models/Conversation');
const ConversationMessage = require('../models/ConversationMessage');
const User = require('../models/User');

const conversationController = {
  // Get all conversations for the current user
  async getUserConversations(req, res) {
    try {
      const userId = req.user.id;
      
      const conversations = await Conversation.getUserConversations(userId);
      
      return res.status(200).json({
        success: true,
        data: conversations
      });
    } catch (error) {
      console.error('Error getting user conversations:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get conversations'
      });
    }
  },

  // Create a new conversation
  async createConversation(req, res) {
    try {
      const userId = req.user.id;
      const { participants, type = 'direct', name = null } = req.body;

      // Validate participants
      if (!participants || !Array.isArray(participants) || participants.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Participants array is required'
        });
      }

      // Add current user to participants if not already included
      const allParticipants = [...new Set([userId, ...participants])];

      // Validate conversation type
      if (type === 'direct' && allParticipants.length !== 2) {
        return res.status(400).json({
          success: false,
          message: 'Direct conversations must have exactly 2 participants'
        });
      }

      if (type === 'group' && allParticipants.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Group conversations must have at least 2 participants'
        });
      }

      // For direct conversations, check if one already exists
      if (type === 'direct') {
        const existingConversation = await Conversation.findDirectConversation(
          allParticipants[0], 
          allParticipants[1]
        );
        
        if (existingConversation) {
          // Return existing conversation with full details
          const fullConversation = await Conversation.getById(existingConversation.id);
          return res.status(200).json({
            success: true,
            data: fullConversation,
            message: 'Conversation already exists'
          });
        }
      }

      // Verify all participants exist
      for (const participantId of allParticipants) {
        const user = await User.getById(participantId);
        if (!user) {
          return res.status(400).json({
            success: false,
            message: `User with ID ${participantId} not found`
          });
        }
      }

      // Create the conversation
      const conversation = await Conversation.create(allParticipants, type, name);
      
      // Get full conversation details with participants
      const fullConversation = await Conversation.getById(conversation.id);

      return res.status(201).json({
        success: true,
        data: fullConversation,
        message: 'Conversation created successfully'
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create conversation'
      });
    }
  },

  // Get a specific conversation
  async getConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      // Check if user is a participant
      const isParticipant = await Conversation.isParticipant(conversationId, userId);
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const conversation = await Conversation.getById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: conversation
      });
    } catch (error) {
      console.error('Error getting conversation:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get conversation'
      });
    }
  },

  // Get messages for a conversation
  async getConversationMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      // Check if user is a participant
      const isParticipant = await Conversation.isParticipant(conversationId, userId);
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const messages = await ConversationMessage.getByConversationId(conversationId, limit, offset);

      return res.status(200).json({
        success: true,
        data: messages
      });
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get messages'
      });
    }
  },

  // Send a message to a conversation
  async sendMessage(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      const { content, type = 'text', file_name, file_size, file_type, file_url } = req.body;

      // Check if user is a participant
      const isParticipant = await Conversation.isParticipant(conversationId, userId);
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Validate message content
      if (type === 'text') {
        if (!content || content.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Message content is required'
          });
        }

        if (content.length > 2000) {
          return res.status(400).json({
            success: false,
            message: 'Message is too long (max 2000 characters)'
          });
        }
      } else if (type === 'file') {
        if (!file_name || !file_url || !file_type) {
          return res.status(400).json({
            success: false,
            message: 'File name, URL, and type are required for file messages'
          });
        }
      }

      // Prepare file data if it's a file message
      let fileData = null;
      if (type === 'file') {
        fileData = {
          file_name,
          file_size,
          file_type,
          file_url
        };
      }

      // Create the message
      const message = await ConversationMessage.create(
        conversationId, 
        userId, 
        content, 
        type, 
        fileData
      );

      // Update conversation's last activity
      await Conversation.updateLastActivity(conversationId);

      return res.status(201).json({
        success: true,
        data: message,
        message: 'Message sent successfully'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send message'
      });
    }
  },

  // Edit a message
  async editMessage(req, res) {
    try {
      const { conversationId, messageId } = req.params;
      const userId = req.user.id;
      const { content } = req.body;

      // Check if user is a participant
      const isParticipant = await Conversation.isParticipant(conversationId, userId);
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Validate content
      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message content is required'
        });
      }

      if (content.length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'Message is too long (max 2000 characters)'
        });
      }

      // Update the message (only if user owns it)
      const updatedMessage = await ConversationMessage.update(messageId, userId, content);

      if (!updatedMessage) {
        return res.status(404).json({
          success: false,
          message: 'Message not found or you do not have permission to edit it'
        });
      }

      return res.status(200).json({
        success: true,
        data: updatedMessage,
        message: 'Message updated successfully'
      });
    } catch (error) {
      console.error('Error editing message:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to edit message'
      });
    }
  },

  // Delete a message
  async deleteMessage(req, res) {
    try {
      const { conversationId, messageId } = req.params;
      const userId = req.user.id;

      // Check if user is a participant
      const isParticipant = await Conversation.isParticipant(conversationId, userId);
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Delete the message (only if user owns it)
      const deletedMessage = await ConversationMessage.delete(messageId, userId);

      if (!deletedMessage) {
        return res.status(404).json({
          success: false,
          message: 'Message not found or you do not have permission to delete it'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete message'
      });
    }
  },

  // Add participant to conversation
  async addParticipant(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      const { participantId } = req.body;

      // Check if user is a participant
      const isParticipant = await Conversation.isParticipant(conversationId, userId);
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Get conversation to check type
      const conversation = await Conversation.getById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      // Only allow adding participants to group conversations
      if (conversation.type !== 'group') {
        return res.status(400).json({
          success: false,
          message: 'Can only add participants to group conversations'
        });
      }

      // Check if participant exists
      const participant = await User.getById(participantId);
      if (!participant) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is already a participant
      const isAlreadyParticipant = await Conversation.isParticipant(conversationId, participantId);
      if (isAlreadyParticipant) {
        return res.status(400).json({
          success: false,
          message: 'User is already a participant'
        });
      }

      // Add participant
      await Conversation.addParticipant(conversationId, participantId);

      return res.status(200).json({
        success: true,
        message: 'Participant added successfully'
      });
    } catch (error) {
      console.error('Error adding participant:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add participant'
      });
    }
  },

  // Remove participant from conversation
  async removeParticipant(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      const { participantId } = req.body;

      // Check if user is a participant
      const isParticipant = await Conversation.isParticipant(conversationId, userId);
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Get conversation to check type
      const conversation = await Conversation.getById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      // Only allow removing participants from group conversations
      if (conversation.type !== 'group') {
        return res.status(400).json({
          success: false,
          message: 'Can only remove participants from group conversations'
        });
      }

      // Users can only remove themselves, unless they're the conversation creator
      // (This would require adding a creator_id field to conversations table)
      if (participantId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only remove yourself from conversations'
        });
      }

      // Remove participant
      await Conversation.removeParticipant(conversationId, participantId);

      return res.status(200).json({
        success: true,
        message: 'Participant removed successfully'
      });
    } catch (error) {
      console.error('Error removing participant:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to remove participant'
      });
    }
  },

  // Search messages in conversation
  async searchMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      const { query } = req.query;
      const limit = parseInt(req.query.limit) || 20;

      // Check if user is a participant
      const isParticipant = await Conversation.isParticipant(conversationId, userId);
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const messages = await ConversationMessage.search(conversationId, query, limit);

      return res.status(200).json({
        success: true,
        data: messages
      });
    } catch (error) {
      console.error('Error searching messages:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to search messages'
      });
    }
  }
};

module.exports = conversationController; 