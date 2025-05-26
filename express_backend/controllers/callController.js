const CallSession = require('../models/CallSession');
const CallParticipant = require('../models/CallParticipant');
const ChatRoom = require('../models/ChatRoom');
const { 
  generateChannelName, 
  generateUserToken, 
  validateConfig,
  getCallQualitySettings,
  getErrorMessage,
  RtcRole,
  AGORA_CONFIG
} = require('../config/agora');

const callController = {
  // Initiate a new call
  async initiateCall(req, res) {
    try {
      const { roomId } = req.params;
      const { callType = 'voice', maxParticipants = 8 } = req.body;
      const userId = req.user.id;

      console.log(`🎯 Initiating ${callType} call - Room: ${roomId}, User: ${userId}`);

      // Validate Agora configuration
      const configValidation = validateConfig();
      if (!configValidation.isValid) {
        console.error('❌ Agora configuration invalid:', configValidation.errors);
        return res.status(500).json({
          success: false,
          message: 'Call service not properly configured',
          errors: configValidation.errors
        });
      }

      // Validate call type
      if (!['voice', 'video', 'screen_share'].includes(callType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid call type. Must be voice, video, or screen_share'
        });
      }

      // Check if room exists and user is a member
      const room = await ChatRoom.getById(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      const isMember = await ChatRoom.isMember(roomId, userId);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'You must be a member of the room to initiate calls'
        });
      }

      // Check if there's already an active call in this room
      const existingCall = await CallSession.getActiveByRoomId(roomId);
      if (existingCall) {
        console.log(`📞 Active call already exists: ${existingCall.id}`);
        
        // Generate token for user to join existing call
        const tokenData = generateUserToken(existingCall.agora_channel_name, userId);
        
        return res.status(200).json({
          success: true,
          message: 'Joining existing call',
          data: {
            callSession: existingCall,
            token: tokenData.token,
            agoraUid: tokenData.uid,
            channelName: existingCall.agora_channel_name,
            appId: AGORA_CONFIG.appId,
            isNewCall: false
          }
        });
      }

      // Generate unique channel name
      const channelName = generateChannelName(roomId, callType);
      console.log(`📡 Generated channel: ${channelName}`);

      // Create call session
      const callSession = await CallSession.create({
        agoraChannelName: channelName,
        agoraAppId: AGORA_CONFIG.appId,
        roomId,
        initiatorId: userId,
        callType,
        maxParticipants,
        recordingEnabled: false,
        encryptionEnabled: true
      });

      if (!callSession) {
        console.error('❌ Failed to create call session');
        return res.status(500).json({
          success: false,
          message: 'Failed to create call session'
        });
      }

      console.log(`✅ Call session created: ${callSession.id}`);

      // Generate Agora token for initiator
      const tokenData = generateUserToken(channelName, userId, RtcRole.PUBLISHER);

      // Add initiator as first participant
      const participant = await CallParticipant.create({
        callSessionId: callSession.id,
        userId,
        agoraUid: tokenData.uid,
        isMuted: false,
        isVideoEnabled: callType === 'video',
        isScreenSharing: false
      });

      if (!participant) {
        console.error('❌ Failed to create call participant');
        // Clean up call session
        await CallSession.delete(callSession.id);
        return res.status(500).json({
          success: false,
          message: 'Failed to add user to call'
        });
      }

      console.log(`✅ Call initiated successfully: ${callSession.id}`);

      // Return call session data and token
      return res.status(201).json({
        success: true,
        message: 'Call initiated successfully',
        data: {
          callSession,
          token: tokenData.token,
          agoraUid: tokenData.uid,
          channelName,
          appId: AGORA_CONFIG.appId,
          expiresAt: tokenData.expiresAt,
          isNewCall: true,
          qualitySettings: getCallQualitySettings()
        }
      });

    } catch (error) {
      console.error('❌ Error initiating call:', error);
      return res.status(500).json({
        success: false,
        message: getErrorMessage(error)
      });
    }
  },

  // Join an existing call
  async joinCall(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      console.log(`🎯 Joining call - Session: ${sessionId}, User: ${userId}`);

      // Get call session
      const callSession = await CallSession.getById(sessionId);
      if (!callSession) {
        return res.status(404).json({
          success: false,
          message: 'Call session not found'
        });
      }

      // Check if call is still active
      if (callSession.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Call session is not active'
        });
      }

      // Check if user is a member of the room
      const isMember = await ChatRoom.isMember(callSession.room_id, userId);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'You must be a member of the room to join this call'
        });
      }

      // Check if user is already in the call
      const existingParticipant = await CallParticipant.getBySessionAndUser(sessionId, userId);
      if (existingParticipant && !existingParticipant.left_at) {
        console.log(`👤 User already in call, returning existing data`);
        
        // Generate new token
        const tokenData = generateUserToken(callSession.agora_channel_name, userId);
        
        return res.status(200).json({
          success: true,
          message: 'Already in call',
          data: {
            callSession,
            token: tokenData.token,
            agoraUid: existingParticipant.agora_uid,
            channelName: callSession.agora_channel_name,
            appId: AGORA_CONFIG.appId,
            participant: existingParticipant
          }
        });
      }

      // Check if call has reached max participants
      const activeCount = await CallParticipant.getActiveCount(sessionId);
      if (activeCount >= callSession.max_participants) {
        return res.status(400).json({
          success: false,
          message: 'Call has reached maximum participants'
        });
      }

      // Generate Agora token
      const tokenData = generateUserToken(callSession.agora_channel_name, userId);

      // Add user as participant
      const participant = await CallParticipant.create({
        callSessionId: sessionId,
        userId,
        agoraUid: tokenData.uid,
        isMuted: false,
        isVideoEnabled: callSession.call_type === 'video',
        isScreenSharing: false
      });

      if (!participant) {
        return res.status(500).json({
          success: false,
          message: 'Failed to join call'
        });
      }

      console.log(`✅ User joined call successfully`);

      return res.status(200).json({
        success: true,
        message: 'Joined call successfully',
        data: {
          callSession,
          token: tokenData.token,
          agoraUid: tokenData.uid,
          channelName: callSession.agora_channel_name,
          appId: AGORA_CONFIG.appId,
          expiresAt: tokenData.expiresAt,
          participant,
          qualitySettings: getCallQualitySettings()
        }
      });

    } catch (error) {
      console.error('❌ Error joining call:', error);
      return res.status(500).json({
        success: false,
        message: getErrorMessage(error)
      });
    }
  },

  // Leave a call
  async leaveCall(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      console.log(`🎯 Leaving call - Session: ${sessionId}, User: ${userId}`);

      // Get call session
      const callSession = await CallSession.getById(sessionId);
      if (!callSession) {
        return res.status(404).json({
          success: false,
          message: 'Call session not found'
        });
      }

      // Mark participant as left
      const participant = await CallParticipant.leave(sessionId, userId);
      if (!participant) {
        return res.status(404).json({
          success: false,
          message: 'You are not in this call'
        });
      }

      console.log(`✅ User left call successfully`);

      // Check if this was the last participant
      const activeCount = await CallParticipant.getActiveCount(sessionId);
      if (activeCount === 0) {
        console.log(`📞 Ending call session - no participants remaining`);
        await CallSession.end(sessionId);
      }

      return res.status(200).json({
        success: true,
        message: 'Left call successfully',
        data: {
          participant,
          callEnded: activeCount === 0
        }
      });

    } catch (error) {
      console.error('❌ Error leaving call:', error);
      return res.status(500).json({
        success: false,
        message: getErrorMessage(error)
      });
    }
  },

  // End a call (only initiator or admin can end)
  async endCall(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      console.log(`🎯 Ending call - Session: ${sessionId}, User: ${userId}`);

      // Get call session
      const callSession = await CallSession.getById(sessionId);
      if (!callSession) {
        return res.status(404).json({
          success: false,
          message: 'Call session not found'
        });
      }

      // Check if user can end the call
      const room = await ChatRoom.getById(callSession.room_id);
      const canEnd = callSession.initiator_id === userId || room.admin_id === userId;
      
      if (!canEnd) {
        return res.status(403).json({
          success: false,
          message: 'Only the call initiator or room admin can end the call'
        });
      }

      // End the call session
      const endedSession = await CallSession.end(sessionId);
      if (!endedSession) {
        return res.status(500).json({
          success: false,
          message: 'Failed to end call'
        });
      }

      // Mark all active participants as left
      const activeParticipants = await CallParticipant.getActiveBySessionId(sessionId);
      const now = new Date();
      
      for (const participant of activeParticipants) {
        await CallParticipant.leave(sessionId, participant.user_id, now);
      }

      console.log(`✅ Call ended successfully`);

      return res.status(200).json({
        success: true,
        message: 'Call ended successfully',
        data: {
          callSession: endedSession,
          participantCount: activeParticipants.length
        }
      });

    } catch (error) {
      console.error('❌ Error ending call:', error);
      return res.status(500).json({
        success: false,
        message: getErrorMessage(error)
      });
    }
  },

  // Get call status and participants
  async getCallStatus(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      const callSession = await CallSession.getById(sessionId);
      if (!callSession) {
        return res.status(404).json({
          success: false,
          message: 'Call session not found'
        });
      }

      // Check if user is a member of the room
      const isMember = await ChatRoom.isMember(callSession.room_id, userId);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const participants = await CallParticipant.getActiveBySessionId(sessionId);
      
      return res.status(200).json({
        success: true,
        data: {
          callSession,
          participants,
          participantCount: participants.length
        }
      });

    } catch (error) {
      console.error('❌ Error getting call status:', error);
      return res.status(500).json({
        success: false,
        message: getErrorMessage(error)
      });
    }
  },

  // Update participant status (mute, video, etc.)
  async updateParticipantStatus(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;
      const { isMuted, isVideoEnabled, isScreenSharing, connectionQuality } = req.body;

      console.log(`🎯 Updating participant status - Session: ${sessionId}, User: ${userId}`);

      // Verify user is in the call
      const participant = await CallParticipant.getBySessionAndUser(sessionId, userId);
      if (!participant || participant.left_at) {
        return res.status(404).json({
          success: false,
          message: 'You are not in this call'
        });
      }

      // Prepare updates
      const updates = {};
      if (typeof isMuted === 'boolean') updates.is_muted = isMuted;
      if (typeof isVideoEnabled === 'boolean') updates.is_video_enabled = isVideoEnabled;
      if (typeof isScreenSharing === 'boolean') updates.is_screen_sharing = isScreenSharing;
      if (connectionQuality) updates.connection_quality = connectionQuality;

      // Update participant
      const updatedParticipant = await CallParticipant.update(sessionId, userId, updates);
      if (!updatedParticipant) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update participant status'
        });
      }

      console.log(`✅ Participant status updated`);

      return res.status(200).json({
        success: true,
        message: 'Participant status updated',
        data: updatedParticipant
      });

    } catch (error) {
      console.error('❌ Error updating participant status:', error);
      return res.status(500).json({
        success: false,
        message: getErrorMessage(error)
      });
    }
  },

  // Get active call for room
  async getActiveCallForRoom(req, res) {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      // Check if user is a member of the room
      const isMember = await ChatRoom.isMember(roomId, userId);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const activeCall = await CallSession.getActiveByRoomId(roomId);
      
      return res.status(200).json({
        success: true,
        data: activeCall
      });

    } catch (error) {
      console.error('❌ Error getting active call:', error);
      return res.status(500).json({
        success: false,
        message: getErrorMessage(error)
      });
    }
  },

  // Get call history for room
  async getCallHistory(req, res) {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 20;

      // Check if user is a member of the room
      const isMember = await ChatRoom.isMember(roomId, userId);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const callHistory = await CallSession.getHistoryByRoomId(roomId, limit);
      
      return res.status(200).json({
        success: true,
        data: callHistory
      });

    } catch (error) {
      console.error('❌ Error getting call history:', error);
      return res.status(500).json({
        success: false,
        message: getErrorMessage(error)
      });
    }
  },

  // Refresh Agora token
  async refreshToken(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      console.log(`🎯 Refreshing token - Session: ${sessionId}, User: ${userId}`);

      // Get call session
      const callSession = await CallSession.getById(sessionId);
      if (!callSession) {
        return res.status(404).json({
          success: false,
          message: 'Call session not found'
        });
      }

      // Verify user is in the call
      const participant = await CallParticipant.getBySessionAndUser(sessionId, userId);
      if (!participant || participant.left_at) {
        return res.status(404).json({
          success: false,
          message: 'You are not in this call'
        });
      }

      // Generate new token
      const tokenData = generateUserToken(callSession.agora_channel_name, userId);

      console.log(`✅ Token refreshed successfully`);

      return res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: tokenData.token,
          expiresAt: tokenData.expiresAt,
          agoraUid: tokenData.uid
        }
      });

    } catch (error) {
      console.error('❌ Error refreshing token:', error);
      return res.status(500).json({
        success: false,
        message: getErrorMessage(error)
      });
    }
  }
};

module.exports = callController; 