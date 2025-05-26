const supabase = require('../config/db');

class Conversation {
  // Create a new conversation
  static async create(participants, type = 'direct', name = null) {
    try {
      // Insert conversation
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          type,
          name,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (conversationError) {
        throw conversationError;
      }

      // Add participants
      const participantInserts = participants.map(userId => ({
        conversation_id: conversation.id,
        user_id: userId,
        joined_at: new Date().toISOString()
      }));

      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert(participantInserts);

      if (participantError) {
        throw participantError;
      }

      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  // Get conversation by ID with participants
  static async getById(conversationId) {
    try {
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants (
            user_id,
            joined_at,
            users (
              id,
              username,
              email,
              avatar_url,
              created_at
            )
          )
        `)
        .eq('id', conversationId)
        .single();

      if (conversationError) {
        throw conversationError;
      }

      if (conversation) {
        // Format participants
        conversation.participants = conversation.conversation_participants.map(cp => ({
          id: cp.users.id,
          username: cp.users.username,
          email: cp.users.email,
          avatar_url: cp.users.avatar_url,
          created_at: cp.users.created_at,
          joined_at: cp.joined_at
        }));
        delete conversation.conversation_participants;
      }

      return conversation;
    } catch (error) {
      console.error('Error getting conversation by ID:', error);
      throw error;
    }
  }

  // Get conversations for a user
  static async getUserConversations(userId) {
    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants!inner (
            user_id,
            joined_at
          ),
          conversation_messages (
            id,
            content,
            created_at,
            user_id,
            users (
              username
            )
          )
        `)
        .eq('conversation_participants.user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Process conversations to include participants and last message
      const processedConversations = await Promise.all(
        conversations.map(async (conversation) => {
          // Get all participants for this conversation
          const { data: participants, error: participantError } = await supabase
            .from('conversation_participants')
            .select(`
              user_id,
              joined_at,
              users (
                id,
                username,
                email,
                avatar_url,
                created_at
              )
            `)
            .eq('conversation_id', conversation.id);

          if (participantError) {
            throw participantError;
          }

          conversation.participants = participants.map(cp => ({
            id: cp.users.id,
            username: cp.users.username,
            email: cp.users.email,
            avatar_url: cp.users.avatar_url,
            created_at: cp.users.created_at,
            joined_at: cp.joined_at
          }));

          // Get last message
          const { data: lastMessage, error: messageError } = await supabase
            .from('conversation_messages')
            .select(`
              *,
              users (
                username
              )
            `)
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!messageError && lastMessage) {
            conversation.last_message = lastMessage;
          }

          // Get unread count for this user
          const { data: unreadMessages, error: unreadError } = await supabase
            .from('conversation_messages')
            .select('id')
            .eq('conversation_id', conversation.id)
            .neq('user_id', userId)
            .gt('created_at', conversation.last_read_at || '1970-01-01');

          if (!unreadError) {
            conversation.unread_count = unreadMessages.length;
          } else {
            conversation.unread_count = 0;
          }

          // Clean up
          delete conversation.conversation_participants;
          delete conversation.conversation_messages;

          return conversation;
        })
      );

      return processedConversations;
    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw error;
    }
  }

  // Check if user is participant in conversation
  static async isParticipant(conversationId, userId) {
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking conversation participant:', error);
      throw error;
    }
  }

  // Find existing direct conversation between two users
  static async findDirectConversation(userId1, userId2) {
    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants (
            user_id
          )
        `)
        .eq('type', 'direct');

      if (error) {
        throw error;
      }

      // Find conversation with exactly these two participants
      for (const conversation of conversations) {
        const participantIds = conversation.conversation_participants.map(cp => cp.user_id);
        if (participantIds.length === 2 && 
            participantIds.includes(userId1) && 
            participantIds.includes(userId2)) {
          return conversation;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding direct conversation:', error);
      throw error;
    }
  }

  // Update conversation's last activity
  static async updateLastActivity(conversationId) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating conversation last activity:', error);
      throw error;
    }
  }

  // Add participant to conversation
  static async addParticipant(conversationId, userId) {
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          joined_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error adding participant to conversation:', error);
      throw error;
    }
  }

  // Remove participant from conversation
  static async removeParticipant(conversationId, userId) {
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error removing participant from conversation:', error);
      throw error;
    }
  }

  // Delete conversation
  static async delete(conversationId) {
    try {
      // Delete participants first (due to foreign key constraints)
      await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId);

      // Delete messages
      await supabase
        .from('conversation_messages')
        .delete()
        .eq('conversation_id', conversationId);

      // Delete conversation
      const { data, error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }
}

module.exports = Conversation; 