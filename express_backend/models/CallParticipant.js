const supabase = require('../config/db');

class CallParticipant {
  // Add participant to call
  static async create(participantData) {
    try {
      const { data, error } = await supabase
        .from('call_participants')
        .insert({
          call_session_id: participantData.callSessionId,
          user_id: participantData.userId,
          agora_uid: participantData.agoraUid,
          is_muted: participantData.isMuted || false,
          is_video_enabled: participantData.isVideoEnabled || true,
          is_screen_sharing: participantData.isScreenSharing || false
        })
        .select(`
          *,
          users(id, username)
        `)
        .single();

      if (error) {
        console.error('Error creating call participant:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error in CallParticipant.create:', error);
      return null;
    }
  }

  // Get participant by session and user
  static async getBySessionAndUser(sessionId, userId) {
    try {
      const { data, error } = await supabase
        .from('call_participants')
        .select(`
          *,
          users(id, username),
          call_sessions(id, agora_channel_name, call_type)
        `)
        .eq('call_session_id', sessionId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting call participant:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error in CallParticipant.getBySessionAndUser:', error);
      return null;
    }
  }

  // Get all participants for a call session
  static async getBySessionId(sessionId) {
    try {
      const { data, error } = await supabase
        .from('call_participants')
        .select(`
          *,
          users(id, username)
        `)
        .eq('call_session_id', sessionId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error getting call participants:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Database error in CallParticipant.getBySessionId:', error);
      return [];
    }
  }

  // Get active participants (not left yet)
  static async getActiveBySessionId(sessionId) {
    try {
      const { data, error } = await supabase
        .from('call_participants')
        .select(`
          *,
          users(id, username)
        `)
        .eq('call_session_id', sessionId)
        .is('left_at', null)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error getting active call participants:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Database error in CallParticipant.getActiveBySessionId:', error);
      return [];
    }
  }

  // Update participant status
  static async update(sessionId, userId, updates) {
    try {
      const { data, error } = await supabase
        .from('call_participants')
        .update(updates)
        .eq('call_session_id', sessionId)
        .eq('user_id', userId)
        .select(`
          *,
          users(id, username)
        `)
        .single();

      if (error) {
        console.error('Error updating call participant:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error in CallParticipant.update:', error);
      return null;
    }
  }

  // Mark participant as left
  static async leave(sessionId, userId, leftAt = new Date()) {
    try {
      // First get the participant to calculate duration
      const participant = await this.getBySessionAndUser(sessionId, userId);
      if (!participant) {
        console.error('Participant not found when trying to leave');
        return null;
      }

      const joinedAt = new Date(participant.joined_at);
      const durationSeconds = Math.floor((leftAt - joinedAt) / 1000);

      const { data, error } = await supabase
        .from('call_participants')
        .update({
          left_at: leftAt.toISOString(),
          duration_seconds: durationSeconds
        })
        .eq('call_session_id', sessionId)
        .eq('user_id', userId)
        .select(`
          *,
          users(id, username)
        `)
        .single();

      if (error) {
        console.error('Error marking participant as left:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error in CallParticipant.leave:', error);
      return null;
    }
  }

  // Toggle mute status
  static async toggleMute(sessionId, userId, isMuted) {
    try {
      return await this.update(sessionId, userId, { is_muted: isMuted });
    } catch (error) {
      console.error('Database error in CallParticipant.toggleMute:', error);
      return null;
    }
  }

  // Toggle video status
  static async toggleVideo(sessionId, userId, isVideoEnabled) {
    try {
      return await this.update(sessionId, userId, { is_video_enabled: isVideoEnabled });
    } catch (error) {
      console.error('Database error in CallParticipant.toggleVideo:', error);
      return null;
    }
  }

  // Toggle screen sharing
  static async toggleScreenShare(sessionId, userId, isScreenSharing) {
    try {
      return await this.update(sessionId, userId, { is_screen_sharing: isScreenSharing });
    } catch (error) {
      console.error('Database error in CallParticipant.toggleScreenShare:', error);
      return null;
    }
  }

  // Update connection quality
  static async updateConnectionQuality(sessionId, userId, quality) {
    try {
      return await this.update(sessionId, userId, { connection_quality: quality });
    } catch (error) {
      console.error('Database error in CallParticipant.updateConnectionQuality:', error);
      return null;
    }
  }

  // Get participant count for session
  static async getActiveCount(sessionId) {
    try {
      const { count, error } = await supabase
        .from('call_participants')
        .select('*', { count: 'exact', head: true })
        .eq('call_session_id', sessionId)
        .is('left_at', null);

      if (error) {
        console.error('Error getting active participant count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Database error in CallParticipant.getActiveCount:', error);
      return 0;
    }
  }

  // Remove participant (for cleanup)
  static async remove(sessionId, userId) {
    try {
      const { error } = await supabase
        .from('call_participants')
        .delete()
        .eq('call_session_id', sessionId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing call participant:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Database error in CallParticipant.remove:', error);
      return false;
    }
  }
}

module.exports = CallParticipant; 