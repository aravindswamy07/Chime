// Call Manager - Comprehensive Agora SDK Integration
// Handles voice calls, video calls, and screen sharing

class CallManager {
  constructor() {
    this.agoraClient = null;
    this.localTracks = {};
    this.remoteUsers = {};
    this.currentCall = null;
    this.isInCall = false;
    this.isMuted = false;
    this.isVideoEnabled = true;
    this.isScreenSharing = false;
    this.callStartTime = null;
    this.callTimer = null;
    this.roomId = null;
    this.token = null;
    this.user = null;
    
    this.init();
  }

  init() {
    // Get user and room data
    this.user = JSON.parse(localStorage.getItem('user') || '{}');
    this.token = localStorage.getItem('token');
    
    // Get room ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    this.roomId = urlParams.get('id');
    
    // Initialize event listeners
    this.setupEventListeners();
    
    // Check for active calls
    this.checkActiveCall();
    
    console.log('📞 Call Manager initialized');
  }

  setupEventListeners() {
    // Call initiation buttons
    document.getElementById('voice-call-button')?.addEventListener('click', () => this.initiateCall('voice'));
    document.getElementById('video-call-button')?.addEventListener('click', () => this.initiateCall('video'));
    document.getElementById('join-active-call-button')?.addEventListener('click', () => this.joinActiveCall());
    
    // Call control buttons
    document.getElementById('mute-button')?.addEventListener('click', () => this.toggleMute());
    document.getElementById('video-button')?.addEventListener('click', () => this.toggleVideo());
    document.getElementById('screen-share-button')?.addEventListener('click', () => this.toggleScreenShare());
    document.getElementById('participants-button')?.addEventListener('click', () => this.showParticipants());
    document.getElementById('end-call-button')?.addEventListener('click', () => this.endCall());
    
    // Modal controls
    document.getElementById('close-call-participants-modal')?.addEventListener('click', () => this.hideParticipants());
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
      if (this.isInCall) {
        this.leaveCall();
      }
    });
  }

  async checkActiveCall() {
    try {
      if (!this.roomId || !this.token) return;

      const response = await fetch(`/api/rooms/${this.roomId}/call/active`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      const data = await response.json();
      if (data.success && data.data) {
        this.showActiveCallIndicator(data.data);
      }
    } catch (error) {
      console.error('Error checking active call:', error);
    }
  }

  showActiveCallIndicator(callSession) {
    const indicator = document.getElementById('active-call-indicator');
    const statusText = document.getElementById('call-status-text');
    const duration = document.getElementById('call-duration');
    
    if (indicator && statusText) {
      statusText.textContent = `${callSession.call_type} call in progress`;
      indicator.classList.remove('hidden');
      
      // Update duration
      if (duration && callSession.started_at) {
        const startTime = new Date(callSession.started_at);
        const updateDuration = () => {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          duration.textContent = this.formatDuration(elapsed);
        };
        updateDuration();
        setInterval(updateDuration, 1000);
      }
    }
  }

  hideActiveCallIndicator() {
    const indicator = document.getElementById('active-call-indicator');
    if (indicator) {
      indicator.classList.add('hidden');
    }
  }

  async initiateCall(callType) {
    try {
      console.log(`🎯 Initiating ${callType} call`);
      
      // Check permissions first
      if (callType === 'video') {
        const hasPermissions = await this.checkPermissions(['camera', 'microphone']);
        if (!hasPermissions) {
          alert('Camera and microphone permissions are required for video calls');
          return;
        }
      } else {
        const hasPermissions = await this.checkPermissions(['microphone']);
        if (!hasPermissions) {
          alert('Microphone permission is required for voice calls');
          return;
        }
      }

      const response = await fetch(`/api/rooms/${this.roomId}/call/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ callType })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message);
      }

      console.log('✅ Call initiated successfully');
      
      // Join the call
      await this.joinCall(data.data);
      
    } catch (error) {
      console.error('❌ Error initiating call:', error);
      alert(`Failed to start call: ${error.message}`);
    }
  }

  async joinActiveCall() {
    try {
      const response = await fetch(`/api/rooms/${this.roomId}/call/active`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      const data = await response.json();
      if (!data.success || !data.data) {
        alert('No active call found');
        return;
      }

      const joinResponse = await fetch(`/api/call/${data.data.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      });

      const joinData = await joinResponse.json();
      if (!joinData.success) {
        throw new Error(joinData.message);
      }

      // Check permissions
      const permissions = data.data.call_type === 'video' 
        ? ['camera', 'microphone'] 
        : ['microphone'];
      
      const hasPermissions = await this.checkPermissions(permissions);
      if (!hasPermissions) {
        alert(`${permissions.join(' and ')} permissions are required for this call`);
        return;
      }

      await this.joinCall(joinData.data);
      
    } catch (error) {
      console.error('❌ Error joining call:', error);
      alert(`Failed to join call: ${error.message}`);
    }
  }

  async joinCall(callData) {
    try {
      console.log('🎯 Joining call with data:', callData);
      
      this.currentCall = callData.callSession;
      this.hideActiveCallIndicator();
      
      // Create Agora client
      this.agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      
      // Setup client event listeners
      this.setupAgoraEventListeners();
      
      // Join channel
      await this.agoraClient.join(
        callData.appId,
        callData.channelName,
        callData.token,
        callData.agoraUid
      );
      
      console.log('✅ Joined Agora channel');
      
      // Create and publish local tracks
      await this.createLocalTracks(this.currentCall.call_type);
      
      // Show call UI
      this.showCallUI();
      this.isInCall = true;
      this.callStartTime = Date.now();
      this.startCallTimer();
      
      // Update UI
      this.updateCallUI();
      
    } catch (error) {
      console.error('❌ Error joining call:', error);
      alert(`Failed to join call: ${error.message}`);
      this.cleanup();
    }
  }

  setupAgoraEventListeners() {
    if (!this.agoraClient) return;

    // User joined
    this.agoraClient.on('user-joined', (user) => {
      console.log('👤 User joined:', user.uid);
      this.remoteUsers[user.uid] = user;
      this.updateParticipantCount();
    });

    // User left
    this.agoraClient.on('user-left', (user) => {
      console.log('👤 User left:', user.uid);
      this.removeRemoteUser(user.uid);
      this.updateParticipantCount();
    });

    // User published (audio/video)
    this.agoraClient.on('user-published', async (user, mediaType) => {
      console.log('📺 User published:', user.uid, mediaType);
      
      // Subscribe to remote user
      await this.agoraClient.subscribe(user, mediaType);
      
      if (mediaType === 'video') {
        this.displayRemoteVideo(user);
      }
      
      if (mediaType === 'audio') {
        // Audio will play automatically
        console.log('🔊 Remote audio track playing');
      }
    });

    // User unpublished
    this.agoraClient.on('user-unpublished', (user, mediaType) => {
      console.log('📺 User unpublished:', user.uid, mediaType);
      
      if (mediaType === 'video') {
        this.removeRemoteVideo(user.uid);
      }
    });

    // Network quality
    this.agoraClient.on('network-quality', (stats) => {
      console.log('📶 Network quality:', stats);
      this.updateConnectionQuality(stats.uplinkNetworkQuality);
    });

    // Exception handling
    this.agoraClient.on('exception', (evt) => {
      console.error('❌ Agora exception:', evt);
    });
  }

  async createLocalTracks(callType) {
    try {
      const tracks = [];
      
      // Always create audio track
      this.localTracks.audio = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: {
          sampleRate: 48000,
          stereo: true,
          bitrate: 128
        }
      });
      tracks.push(this.localTracks.audio);
      
      // Create video track for video calls
      if (callType === 'video') {
        this.localTracks.video = await AgoraRTC.createCameraVideoTrack({
          optimizationMode: 'motion',
          encoderConfig: {
            width: 640,
            height: 480,
            frameRate: 15,
            bitrateMin: 400,
            bitrateMax: 1500
          }
        });
        tracks.push(this.localTracks.video);
        
        // Display local video
        this.displayLocalVideo();
      }
      
      // Publish tracks
      if (tracks.length > 0) {
        await this.agoraClient.publish(tracks);
        console.log('✅ Local tracks published');
      }
      
    } catch (error) {
      console.error('❌ Error creating local tracks:', error);
      throw error;
    }
  }

  displayLocalVideo() {
    if (this.localTracks.video) {
      const localVideo = document.getElementById('local-video');
      if (localVideo) {
        this.localTracks.video.play(localVideo);
      }
    }
  }

  displayRemoteVideo(user) {
    const remoteVideosGrid = document.getElementById('remote-videos-grid');
    const placeholder = document.getElementById('no-video-placeholder');
    
    if (placeholder) {
      placeholder.style.display = 'none';
    }
    
    // Create video container
    const videoContainer = document.createElement('div');
    videoContainer.id = `remote-video-${user.uid}`;
    videoContainer.className = 'relative bg-gray-800 rounded-lg overflow-hidden';
    videoContainer.style.width = '100%';
    videoContainer.style.height = '100%';
    
    // Create video element
    const videoElement = document.createElement('div');
    videoElement.className = 'w-full h-full';
    
    // Create user label
    const userLabel = document.createElement('div');
    userLabel.className = 'absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded';
    userLabel.textContent = `User ${user.uid}`;
    
    videoContainer.appendChild(videoElement);
    videoContainer.appendChild(userLabel);
    
    // Update grid layout
    this.updateVideoGrid();
    
    remoteVideosGrid.appendChild(videoContainer);
    
    // Play remote video
    if (user.videoTrack) {
      user.videoTrack.play(videoElement);
    }
  }

  removeRemoteVideo(uid) {
    const videoContainer = document.getElementById(`remote-video-${uid}`);
    if (videoContainer) {
      videoContainer.remove();
    }
    
    delete this.remoteUsers[uid];
    this.updateVideoGrid();
    
    // Show placeholder if no remote videos
    const remoteVideosGrid = document.getElementById('remote-videos-grid');
    const placeholder = document.getElementById('no-video-placeholder');
    
    if (remoteVideosGrid && placeholder && remoteVideosGrid.children.length === 1) {
      placeholder.style.display = 'block';
    }
  }

  removeRemoteUser(uid) {
    this.removeRemoteVideo(uid);
    delete this.remoteUsers[uid];
  }

  updateVideoGrid() {
    const remoteVideosGrid = document.getElementById('remote-videos-grid');
    if (!remoteVideosGrid) return;
    
    const videoCount = Object.keys(this.remoteUsers).length;
    
    // Adjust grid layout based on participant count
    if (videoCount === 1) {
      remoteVideosGrid.className = 'w-full h-full grid place-items-center';
    } else if (videoCount === 2) {
      remoteVideosGrid.className = 'w-full h-full grid grid-cols-2 gap-2 p-4';
    } else if (videoCount <= 4) {
      remoteVideosGrid.className = 'w-full h-full grid grid-cols-2 grid-rows-2 gap-2 p-4';
    } else if (videoCount <= 6) {
      remoteVideosGrid.className = 'w-full h-full grid grid-cols-3 grid-rows-2 gap-2 p-4';
    } else {
      remoteVideosGrid.className = 'w-full h-full grid grid-cols-3 grid-rows-3 gap-2 p-4';
    }
  }

  async toggleMute() {
    try {
      if (this.localTracks.audio) {
        if (this.isMuted) {
          await this.localTracks.audio.setEnabled(true);
          this.isMuted = false;
        } else {
          await this.localTracks.audio.setEnabled(false);
          this.isMuted = true;
        }
        
        this.updateMuteButton();
        await this.updateParticipantStatus();
      }
    } catch (error) {
      console.error('❌ Error toggling mute:', error);
    }
  }

  async toggleVideo() {
    try {
      if (this.currentCall?.call_type === 'video') {
        if (this.localTracks.video) {
          if (this.isVideoEnabled) {
            await this.localTracks.video.setEnabled(false);
            this.isVideoEnabled = false;
          } else {
            await this.localTracks.video.setEnabled(true);
            this.isVideoEnabled = true;
          }
          
          this.updateVideoButton();
          await this.updateParticipantStatus();
        }
      }
    } catch (error) {
      console.error('❌ Error toggling video:', error);
    }
  }

  async toggleScreenShare() {
    try {
      if (this.isScreenSharing) {
        await this.stopScreenShare();
      } else {
        await this.startScreenShare();
      }
    } catch (error) {
      console.error('❌ Error toggling screen share:', error);
      alert('Screen sharing failed. Please try again.');
    }
  }

  async startScreenShare() {
    try {
      // Create screen share track
      const screenTrack = await AgoraRTC.createScreenVideoTrack({
        optimizationMode: 'detail',
        encoderConfig: {
          width: 1920,
          height: 1080,
          frameRate: 15,
          bitrateMin: 1000,
          bitrateMax: 3000
        }
      });

      // Replace video track with screen share
      if (this.localTracks.video) {
        await this.agoraClient.unpublish(this.localTracks.video);
        this.localTracks.video.close();
      }

      this.localTracks.screen = screenTrack;
      await this.agoraClient.publish(screenTrack);

      this.isScreenSharing = true;
      this.updateScreenShareButton();
      await this.updateParticipantStatus();

      // Handle screen share end
      screenTrack.on('track-ended', () => {
        this.stopScreenShare();
      });

      console.log('✅ Screen sharing started');

    } catch (error) {
      console.error('❌ Error starting screen share:', error);
      throw error;
    }
  }

  async stopScreenShare() {
    try {
      if (this.localTracks.screen) {
        await this.agoraClient.unpublish(this.localTracks.screen);
        this.localTracks.screen.close();
        delete this.localTracks.screen;
      }

      // Restore camera if this is a video call
      if (this.currentCall?.call_type === 'video') {
        this.localTracks.video = await AgoraRTC.createCameraVideoTrack();
        await this.agoraClient.publish(this.localTracks.video);
        this.displayLocalVideo();
      }

      this.isScreenSharing = false;
      this.updateScreenShareButton();
      await this.updateParticipantStatus();

      console.log('✅ Screen sharing stopped');

    } catch (error) {
      console.error('❌ Error stopping screen share:', error);
    }
  }

  async updateParticipantStatus() {
    try {
      if (!this.currentCall) return;

      await fetch(`/api/call/${this.currentCall.id}/participant`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          isMuted: this.isMuted,
          isVideoEnabled: this.isVideoEnabled,
          isScreenSharing: this.isScreenSharing
        })
      });
    } catch (error) {
      console.error('❌ Error updating participant status:', error);
    }
  }

  async endCall() {
    try {
      if (this.currentCall) {
        await fetch(`/api/call/${this.currentCall.id}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        });
      }
      
      this.leaveCall();
    } catch (error) {
      console.error('❌ Error ending call:', error);
      this.leaveCall(); // Leave anyway
    }
  }

  async leaveCall() {
    try {
      if (this.currentCall) {
        await fetch(`/api/call/${this.currentCall.id}/leave`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        });
      }
    } catch (error) {
      console.error('❌ Error leaving call:', error);
    } finally {
      this.cleanup();
    }
  }

  cleanup() {
    // Stop timer
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
    
    // Close local tracks
    Object.values(this.localTracks).forEach(track => {
      if (track) {
        track.close();
      }
    });
    this.localTracks = {};
    
    // Leave Agora channel
    if (this.agoraClient) {
      this.agoraClient.leave();
      this.agoraClient = null;
    }
    
    // Reset state
    this.currentCall = null;
    this.isInCall = false;
    this.isMuted = false;
    this.isVideoEnabled = true;
    this.isScreenSharing = false;
    this.remoteUsers = {};
    this.callStartTime = null;
    
    // Hide call UI
    this.hideCallUI();
    
    // Check for active calls again
    setTimeout(() => this.checkActiveCall(), 1000);
    
    console.log('🧹 Call cleanup completed');
  }

  // UI Management Methods
  showCallUI() {
    const callModal = document.getElementById('call-modal');
    if (callModal) {
      callModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  hideCallUI() {
    const callModal = document.getElementById('call-modal');
    if (callModal) {
      callModal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  updateCallUI() {
    if (!this.currentCall) return;
    
    // Update call type
    const callTypeText = document.getElementById('call-type-text');
    if (callTypeText) {
      callTypeText.textContent = `${this.currentCall.call_type.charAt(0).toUpperCase() + this.currentCall.call_type.slice(1)} Call`;
    }
    
    // Show/hide video elements based on call type
    const localVideoContainer = document.getElementById('local-video-container');
    const videoButton = document.getElementById('video-button');
    
    if (this.currentCall.call_type === 'voice') {
      if (localVideoContainer) localVideoContainer.style.display = 'none';
      if (videoButton) videoButton.style.display = 'none';
    } else {
      if (localVideoContainer) localVideoContainer.style.display = 'block';
      if (videoButton) videoButton.style.display = 'flex';
    }
    
    this.updateMuteButton();
    this.updateVideoButton();
    this.updateScreenShareButton();
  }

  updateMuteButton() {
    const muteButton = document.getElementById('mute-button');
    const muteIcon = document.getElementById('mute-icon');
    
    if (muteButton && muteIcon) {
      if (this.isMuted) {
        muteButton.classList.remove('bg-gray-600', 'hover:bg-gray-500');
        muteButton.classList.add('bg-red-600', 'hover:bg-red-700');
        muteIcon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clip-rule="evenodd" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        `;
      } else {
        muteButton.classList.remove('bg-red-600', 'hover:bg-red-700');
        muteButton.classList.add('bg-gray-600', 'hover:bg-gray-500');
        muteIcon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        `;
      }
    }
  }

  updateVideoButton() {
    const videoButton = document.getElementById('video-button');
    const videoIcon = document.getElementById('video-icon');
    
    if (videoButton && videoIcon) {
      if (!this.isVideoEnabled) {
        videoButton.classList.remove('bg-gray-600', 'hover:bg-gray-500');
        videoButton.classList.add('bg-red-600', 'hover:bg-red-700');
        videoIcon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
        `;
      } else {
        videoButton.classList.remove('bg-red-600', 'hover:bg-red-700');
        videoButton.classList.add('bg-gray-600', 'hover:bg-gray-500');
        videoIcon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        `;
      }
    }
  }

  updateScreenShareButton() {
    const screenShareButton = document.getElementById('screen-share-button');
    
    if (screenShareButton) {
      if (this.isScreenSharing) {
        screenShareButton.classList.remove('bg-gray-600', 'hover:bg-gray-500');
        screenShareButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
      } else {
        screenShareButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        screenShareButton.classList.add('bg-gray-600', 'hover:bg-gray-500');
      }
    }
  }

  updateParticipantCount() {
    const participantCount = Object.keys(this.remoteUsers).length + 1; // +1 for self
    const participantsCountElement = document.getElementById('participants-count');
    
    if (participantsCountElement) {
      participantsCountElement.textContent = `${participantCount} participant${participantCount !== 1 ? 's' : ''}`;
    }
  }

  startCallTimer() {
    this.callTimer = setInterval(() => {
      if (this.callStartTime) {
        const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
        const timerElement = document.getElementById('call-timer');
        if (timerElement) {
          timerElement.textContent = this.formatDuration(elapsed);
        }
      }
    }, 1000);
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  updateConnectionQuality(quality) {
    // Update connection quality indicator (optional feature)
    console.log('📶 Connection quality:', quality);
  }

  showParticipants() {
    const modal = document.getElementById('call-participants-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.loadCallParticipants();
    }
  }

  hideParticipants() {
    const modal = document.getElementById('call-participants-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  async loadCallParticipants() {
    try {
      if (!this.currentCall) return;

      const response = await fetch(`/api/call/${this.currentCall.id}/status`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      const data = await response.json();
      if (data.success) {
        this.displayCallParticipants(data.data.participants);
      }
    } catch (error) {
      console.error('❌ Error loading call participants:', error);
    }
  }

  displayCallParticipants(participants) {
    const list = document.getElementById('call-participants-list');
    if (!list) return;

    list.innerHTML = participants.map(participant => {
      const isCurrentUser = participant.user_id === this.user.id;
      const statusIcons = [];
      
      if (participant.is_muted) statusIcons.push('🔇');
      if (!participant.is_video_enabled) statusIcons.push('📷');
      if (participant.is_screen_sharing) statusIcons.push('🖥️');
      
      return `
        <div class="flex justify-between items-center p-3 border-b border-gray-200">
          <div>
            <span class="font-medium">${participant.users?.username || 'Unknown'}</span>
            ${isCurrentUser ? '<span class="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">You</span>' : ''}
            ${statusIcons.length > 0 ? `<span class="ml-2 text-sm">${statusIcons.join(' ')}</span>` : ''}
          </div>
          <div class="text-sm text-gray-500">
            ${participant.connection_quality || 'Unknown'} connection
          </div>
        </div>
      `;
    }).join('');
  }

  async checkPermissions(permissions) {
    try {
      for (const permission of permissions) {
        if (permission === 'microphone') {
          const result = await navigator.permissions.query({ name: 'microphone' });
          if (result.state === 'denied') return false;
        } else if (permission === 'camera') {
          const result = await navigator.permissions.query({ name: 'camera' });
          if (result.state === 'denied') return false;
        }
      }
      
      // Test actual access
      try {
        const constraints = {};
        if (permissions.includes('microphone')) constraints.audio = true;
        if (permissions.includes('camera')) constraints.video = true;
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (error) {
        console.error('Media access denied:', error);
        return false;
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }
}

// Initialize call manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (typeof AgoraRTC !== 'undefined') {
    window.callManager = new CallManager();
  } else {
    console.error('❌ Agora SDK not loaded');
  }
}); 