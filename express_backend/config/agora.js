const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const crypto = require('crypto');

// Agora configuration
const AGORA_CONFIG = {
  appId: process.env.AGORA_APP_ID || 'your_agora_app_id',
  appCertificate: process.env.AGORA_APP_CERTIFICATE || 'your_agora_app_certificate',
  tokenExpirationInSeconds: 3600, // 1 hour
  privilegeExpirationInSeconds: 3600 // 1 hour
};

// Generate a unique channel name
function generateChannelName(roomId, callType = 'voice') {
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  return `${callType}_${roomId}_${timestamp}_${randomSuffix}`;
}

// Generate a unique Agora UID for user
function generateAgoraUid(userId) {
  // Convert UUID to a numeric UID for Agora
  // We'll use a hash of the user ID to ensure consistency
  const hash = crypto.createHash('md5').update(userId).digest('hex');
  // Take first 8 characters and convert to integer
  const uid = parseInt(hash.substring(0, 8), 16);
  // Ensure it's within Agora's UID range (1 to 2^32-1)
  return Math.abs(uid) % (Math.pow(2, 32) - 1) + 1;
}

// Generate Agora token for voice/video calls
function generateToken(channelName, uid, role = RtcRole.PUBLISHER) {
  try {
    if (!AGORA_CONFIG.appId || !AGORA_CONFIG.appCertificate) {
      throw new Error('Agora App ID and App Certificate must be configured');
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + AGORA_CONFIG.privilegeExpirationInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_CONFIG.appId,
      AGORA_CONFIG.appCertificate,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );

    return {
      token,
      uid,
      channelName,
      appId: AGORA_CONFIG.appId,
      expiresAt: new Date((currentTimestamp + AGORA_CONFIG.tokenExpirationInSeconds) * 1000)
    };
  } catch (error) {
    console.error('Error generating Agora token:', error);
    throw error;
  }
}

// Generate token for specific user and channel
function generateUserToken(channelName, userId, role = RtcRole.PUBLISHER) {
  const uid = generateAgoraUid(userId);
  return generateToken(channelName, uid, role);
}

// Validate Agora configuration
function validateConfig() {
  const errors = [];
  
  if (!AGORA_CONFIG.appId || AGORA_CONFIG.appId === 'your_agora_app_id') {
    errors.push('AGORA_APP_ID environment variable is not set');
  }
  
  if (!AGORA_CONFIG.appCertificate || AGORA_CONFIG.appCertificate === 'your_agora_app_certificate') {
    errors.push('AGORA_APP_CERTIFICATE environment variable is not set');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Get call quality settings based on connection quality
function getCallQualitySettings(connectionQuality = 'unknown') {
  const settings = {
    unknown: {
      video: { width: 640, height: 480, frameRate: 15, bitrate: 500 },
      audio: { bitrate: 48, sampleRate: 48000 }
    },
    excellent: {
      video: { width: 1280, height: 720, frameRate: 30, bitrate: 1500 },
      audio: { bitrate: 128, sampleRate: 48000 }
    },
    good: {
      video: { width: 854, height: 480, frameRate: 24, bitrate: 800 },
      audio: { bitrate: 64, sampleRate: 48000 }
    },
    fair: {
      video: { width: 640, height: 480, frameRate: 15, bitrate: 500 },
      audio: { bitrate: 48, sampleRate: 48000 }
    },
    poor: {
      video: { width: 424, height: 240, frameRate: 10, bitrate: 250 },
      audio: { bitrate: 32, sampleRate: 32000 }
    },
    bad: {
      video: { width: 320, height: 180, frameRate: 7, bitrate: 150 },
      audio: { bitrate: 24, sampleRate: 16000 }
    }
  };
  
  return settings[connectionQuality] || settings.unknown;
}

// Create Agora client configuration
function getClientConfig(callType = 'voice') {
  const baseConfig = {
    mode: 'rtc',
    codec: 'vp8'
  };
  
  if (callType === 'video' || callType === 'screen_share') {
    return {
      ...baseConfig,
      mode: 'rtc',
      codec: 'vp8'
    };
  }
  
  return baseConfig;
}

// Network quality mapping
const NETWORK_QUALITY = {
  0: 'unknown',
  1: 'excellent',
  2: 'good', 
  3: 'fair',
  4: 'poor',
  5: 'bad',
  6: 'down'
};

// Map Agora network quality to readable string
function mapNetworkQuality(quality) {
  return NETWORK_QUALITY[quality] || 'unknown';
}

// Error code mappings
const AGORA_ERRORS = {
  'INVALID_VENDOR_KEY': 'Invalid Agora App ID',
  'INVALID_CHANNEL_NAME': 'Invalid channel name',
  'PERMISSION_DENIED': 'Microphone/camera permission denied',
  'NETWORK_ERROR': 'Network connection error',
  'WEBSOCKET_ERROR': 'WebSocket connection error',
  'TOKEN_EXPIRED': 'Access token expired',
  'INVALID_TOKEN': 'Invalid access token'
};

// Get user-friendly error message
function getErrorMessage(error) {
  if (typeof error === 'string') {
    return AGORA_ERRORS[error] || error;
  }
  
  if (error && error.code) {
    return AGORA_ERRORS[error.code] || error.message || error.code;
  }
  
  return error?.message || 'Unknown error occurred';
}

module.exports = {
  AGORA_CONFIG,
  generateChannelName,
  generateAgoraUid,
  generateToken,
  generateUserToken,
  validateConfig,
  getCallQualitySettings,
  getClientConfig,
  mapNetworkQuality,
  getErrorMessage,
  RtcRole
}; 