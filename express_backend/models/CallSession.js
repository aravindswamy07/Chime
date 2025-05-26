const supabase = require('../config/db');

class CallSession {
  // Create a new call session
  static async create(sessionData) {
    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .insert({
          agora_channel_name: sessionData.agoraChannelName,
          agora_app_id: sessionData.agoraAppId,
          room_id: sessionData.roomId,
          initiator_id: sessionData.initiatorId,
          call_type: sessionData.callType,
          max_participants: sessionData.maxParticipants || 8,
          recording_enabled: sessionData.recordingEnabled || false,
          encryption_enabled: sessionData.encryptionEnabled || true
        })
        .select(`
          *,
          chat_rooms(id, name),
          users!initiator_id(id, username)
        `)
        .single();

      if (error) {
        console.error('Error creating call session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error in CallSession.create:', error);
      return null;
    }
  }

  // Get call session by ID
  static async getById(sessionId) {
    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .select(`
          *,
          chat_rooms(id, name, description),
          users!initiator_id(id, username),
          call_participants(
            *,
            users(id, username)
          )
        `)
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('Error getting call session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error in CallSession.getById:', error);
      return null;
    }
  }

  // Get active call session for room
  static async getActiveByRoomId(roomId) {
    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .select(`
          *,
          chat_rooms(id, name),
          users!initiator_id(id, username),
          call_participants(
            *,
            users(id, username)
          )
        `)
        .eq('room_id', roomId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error getting active call session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error in CallSession.getActiveByRoomId:', error);
      return null;
    }
  }

  // Get call session by Agora channel name
  static async getByChannelName(channelName) {
    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .select(`
          *,
          chat_rooms(id, name),
          users!initiator_id(id, username),
          call_participants(
            *,
            users(id, username)
          )
        `)
        .eq('agora_channel_name', channelName)
        .single();

      if (error) {
        console.error('Error getting call session by channel name:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error in CallSession.getByChannelName:', error);
      return null;
    }
  }

  // Update call session
  static async update(sessionId, updates) {
    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating call session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error in CallSession.update:', error);
      return null;
    }
  }

  // End call session
  static async end(sessionId, endedAt = new Date()) {
    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .update({
          status: 'ended',
          ended_at: endedAt.toISOString(),
          duration_seconds: Math.floor((endedAt - new Date(data?.started_at || endedAt)) / 1000)
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('Error ending call session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error in CallSession.end:', error);
      return null;
    }
  }

  // Get call history for room
  static async getHistoryByRoomId(roomId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .select(`
          *,
          users!initiator_id(id, username),
          call_participants(
            *,
            users(id, username)
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting call history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Database error in CallSession.getHistoryByRoomId:', error);
      return [];
    }
  }

  // Delete call session (for cleanup)
  static async delete(sessionId) {
    try {
      const { error } = await supabase
        .from('call_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        console.error('Error deleting call session:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Database error in CallSession.delete:', error);
      return false;
    }
  }
}

module.exports = CallSession; 