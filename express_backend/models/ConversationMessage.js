const supabase = require('../config/db');

class ConversationMessage {
  // Create a new message in a conversation
  static async create(conversationId, userId, content, type = 'text', fileData = null) {
    try {
      const messageData = {
        conversation_id: conversationId,
        user_id: userId,
        content,
        type,
        created_at: new Date().toISOString()
      };

      // Add file data if it's a file message
      if (type === 'file' && fileData) {
        messageData.file_name = fileData.file_name;
        messageData.file_size = fileData.file_size;
        messageData.file_type = fileData.file_type;
        messageData.file_url = fileData.file_url;
      }

      const { data, error } = await supabase
        .from('conversation_messages')
        .insert(messageData)
        .select(`
          *,
          users (
            id,
            username,
            email,
            avatar_url
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating conversation message:', error);
      throw error;
    }
  }

  // Get messages for a conversation
  static async getByConversationId(conversationId, limit = 50, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select(`
          *,
          users (
            id,
            username,
            email,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      throw error;
    }
  }

  // Get recent messages for a conversation
  static async getRecentByConversationId(conversationId, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select(`
          *,
          users (
            id,
            username,
            email,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      // Reverse to get chronological order
      return data.reverse();
    } catch (error) {
      console.error('Error getting recent conversation messages:', error);
      throw error;
    }
  }

  // Get message by ID
  static async getById(messageId) {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select(`
          *,
          users (
            id,
            username,
            email,
            avatar_url
          )
        `)
        .eq('id', messageId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting conversation message by ID:', error);
      throw error;
    }
  }

  // Update message content (for editing)
  static async update(messageId, userId, content) {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .update({
          content,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('user_id', userId) // Only allow user to edit their own messages
        .select(`
          *,
          users (
            id,
            username,
            email,
            avatar_url
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating conversation message:', error);
      throw error;
    }
  }

  // Delete message
  static async delete(messageId, userId) {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', userId) // Only allow user to delete their own messages
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error deleting conversation message:', error);
      throw error;
    }
  }

  // Get message count for conversation
  static async getCountByConversationId(conversationId) {
    try {
      const { count, error } = await supabase
        .from('conversation_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);

      if (error) {
        throw error;
      }

      return count;
    } catch (error) {
      console.error('Error getting conversation message count:', error);
      throw error;
    }
  }

  // Search messages in conversation
  static async search(conversationId, query, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select(`
          *,
          users (
            id,
            username,
            email,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error searching conversation messages:', error);
      throw error;
    }
  }

  // Get messages after a specific timestamp (for real-time updates)
  static async getAfterTimestamp(conversationId, timestamp) {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select(`
          *,
          users (
            id,
            username,
            email,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .gt('created_at', timestamp)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting messages after timestamp:', error);
      throw error;
    }
  }

  // Mark messages as read for a user
  static async markAsRead(conversationId, userId, timestamp = null) {
    try {
      const readTimestamp = timestamp || new Date().toISOString();
      
      // Update the conversation's last_read_at for this user
      // Note: This would require a conversation_participants table with last_read_at column
      // For now, we'll just return success
      return { success: true, timestamp: readTimestamp };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  // Get unread message count for user in conversation
  static async getUnreadCount(conversationId, userId, lastReadAt = null) {
    try {
      let query = supabase
        .from('conversation_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .neq('user_id', userId); // Don't count user's own messages

      if (lastReadAt) {
        query = query.gt('created_at', lastReadAt);
      }

      const { count, error } = await query;

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      throw error;
    }
  }
}

module.exports = ConversationMessage; 