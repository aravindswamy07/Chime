// Discord-style Server Chat JavaScript
class ChimeServer {
    constructor() {
        this.currentUser = null;
        this.currentRoom = null;
        this.currentChannel = 'general';
        this.channelType = 'text';
        this.messages = new Map();
        this.members = new Map();
        this.socket = null;
        this.callManager = null;
        this.voiceConnected = false;
        
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        this.connectWebSocket();
        await this.loadRoomData();
        await this.loadMessages();
        await this.loadMembers();
        this.initializeCallManager();
    }

    async checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Token invalid');
            }
            
            const data = await response.json();
            this.currentUser = data.user;
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    }

    setupEventListeners() {
        // Message input
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Channel switching
        document.querySelectorAll('.channel-item').forEach(item => {
            item.addEventListener('click', () => {
                this.switchChannel(item);
            });
        });

        // Voice channel connection
        document.querySelectorAll('[data-channel-type="voice"]').forEach(item => {
            const connectBtn = item.querySelector('button[title="Connect"]');
            if (connectBtn) {
                connectBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleVoiceConnection(item.dataset.channelName);
                });
            }
        });

        // Members toggle
        document.getElementById('members-toggle-button').addEventListener('click', () => {
            this.toggleMembersPanel();
        });

        // Call buttons
        document.getElementById('voice-call-button').addEventListener('click', () => {
            this.startVoiceCall();
        });

        document.getElementById('video-call-button').addEventListener('click', () => {
            this.startVideoCall();
        });

        // User controls
        document.getElementById('user-mute-button').addEventListener('click', () => {
            this.toggleMute();
        });

        document.getElementById('user-deafen-button').addEventListener('click', () => {
            this.toggleDeafen();
        });

        document.getElementById('user-settings-button').addEventListener('click', () => {
            this.openSettings();
        });

        // Members section click
        document.getElementById('members-section').addEventListener('click', () => {
            this.toggleMembersPanel();
        });
    }

    connectWebSocket() {
        const token = localStorage.getItem('token');
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}?token=${token}`;
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            console.log('WebSocket connected');
            if (this.currentRoom) {
                this.socket.send(JSON.stringify({
                    type: 'join_room',
                    roomId: this.currentRoom.id
                }));
            }
        };
        
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.socket.onclose = () => {
            console.log('WebSocket disconnected');
            setTimeout(() => this.connectWebSocket(), 3000);
        };
        
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'new_message':
                this.handleNewMessage(data.message);
                break;
            case 'user_joined':
                this.handleUserJoined(data.user);
                break;
            case 'user_left':
                this.handleUserLeft(data.userId);
                break;
            case 'voice_state_update':
                this.handleVoiceStateUpdate(data);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    async loadRoomData() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('id');
        
        if (!roomId) {
            window.location.href = 'home.html';
            return;
        }

        try {
            const response = await fetch(`/api/rooms/${roomId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.currentRoom = result.data;
                this.updateServerInfo();
            } else {
                throw new Error('Failed to load room');
            }
        } catch (error) {
            console.error('Failed to load room:', error);
            window.location.href = 'home.html';
        }
    }

    updateServerInfo() {
        if (this.currentRoom) {
            document.getElementById('server-name').textContent = this.currentRoom.name;
            document.getElementById('server-icon').textContent = this.currentRoom.name.charAt(0).toUpperCase();
            
            // Update current user info
            if (this.currentUser) {
                document.getElementById('current-username').textContent = this.currentUser.username;
                
                const avatar = document.getElementById('current-user-avatar');
                if (this.currentUser.avatar_url) {
                    avatar.src = this.currentUser.avatar_url;
                } else {
                    avatar.src = `https://via.placeholder.com/32/5865f2/ffffff?text=${this.currentUser.username.charAt(0).toUpperCase()}`;
                }
            }
        }
    }

    async loadMessages() {
        if (!this.currentRoom) return;

        try {
            const response = await fetch(`/api/rooms/${this.currentRoom.id}/messages`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.messages.set(this.currentChannel, result.data || []);
                this.displayMessages();
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }

    async loadMembers() {
        if (!this.currentRoom) return;

        try {
            const response = await fetch(`/api/rooms/${this.currentRoom.id}/members`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                const members = result.data || [];
                
                members.forEach(member => {
                    this.members.set(member.id, member);
                });
                
                this.updateMembersList();
                this.updateMemberCounts();
            }
        } catch (error) {
            console.error('Failed to load members:', error);
        }
    }

    displayMessages() {
        const messagesContainer = document.getElementById('messages-container');
        const welcomeMessage = document.getElementById('welcome-message');
        const channelMessages = this.messages.get(this.currentChannel) || [];

        if (channelMessages.length === 0) {
            if (welcomeMessage) {
                welcomeMessage.style.display = 'flex';
            }
            return;
        }

        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }

        // Clear existing messages except welcome
        const existingMessages = messagesContainer.querySelectorAll('.message-bubble');
        existingMessages.forEach(msg => msg.remove());

        channelMessages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });

        this.scrollToBottom();
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-bubble flex items-start space-x-3 p-2 rounded hover:bg-gray-800 hover:bg-opacity-30';

        const isCurrentUser = message.user_id === this.currentUser.id;
        const user = isCurrentUser ? this.currentUser : this.members.get(message.user_id);

        const timestamp = new Date(message.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        let contentHtml = '';
        if (message.message_type === 'file') {
            contentHtml = this.createFileMessageContent(message);
        } else {
            contentHtml = `<div class="text-sm mt-1" style="color: var(--discord-text-primary);">
                ${this.formatMessageContent(message.content)}
            </div>`;
        }

        messageDiv.innerHTML = `
            <div class="user-avatar">
                <img src="${user?.avatar_url || `https://via.placeholder.com/40/5865f2/ffffff?text=${user?.username?.charAt(0).toUpperCase() || 'U'}`}" 
                     alt="${user?.username || 'User'}" class="w-10 h-10 rounded-full">
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-baseline space-x-2">
                    <span class="text-sm font-semibold">${user?.username || 'Unknown User'}</span>
                    <span class="text-xs" style="color: var(--discord-text-muted);">${timestamp}</span>
                </div>
                ${contentHtml}
            </div>
        `;
        
        return messageDiv;
    }

    createFileMessageContent(message) {
        const fileIcon = this.getFileIcon(message.file_type);
        const fileSize = this.formatFileSize(message.file_size);
        
        return `
            <div class="mt-2 p-3 rounded-lg border" style="background-color: var(--discord-bg-tertiary); border-color: var(--discord-border);">
                <div class="flex items-center space-x-3">
                    ${fileIcon}
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium truncate">${message.file_name}</div>
                        <div class="text-xs" style="color: var(--discord-text-muted);">${fileSize}</div>
                    </div>
                    <a href="${message.file_url}" download="${message.file_name}" 
                       class="p-2 rounded hover:bg-gray-600 transition-colors" title="Download">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>
                    </a>
                </div>
                ${message.content ? `<div class="mt-2 text-sm">${this.formatMessageContent(message.content)}</div>` : ''}
            </div>
        `;
    }

    formatMessageContent(content) {
        if (!content) return '';
        
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code style="background-color: var(--discord-bg-tertiary); padding: 2px 4px; border-radius: 3px;">$1</code>')
            .replace(/~~(.*?)~~/g, '<del>$1</del>');
    }

    getFileIcon(fileType) {
        if (fileType?.startsWith('image/')) {
            return `<svg class="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>`;
        } else if (fileType === 'application/pdf') {
            return `<svg class="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v1h-1.5V7h3v1.5zM9 9.5h1v-1H9v1z"/>
            </svg>`;
        } else {
            return `<svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6,2C4.89,2 4,2.89 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z"/>
            </svg>`;
        }
    }

    formatFileSize(bytes) {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async sendMessage() {
        const messageInput = document.getElementById('message-input');
        const content = messageInput.value.trim();
        
        if (!content || !this.currentRoom) return;

        try {
            const response = await fetch(`/api/rooms/${this.currentRoom.id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ content })
            });

            if (response.ok) {
                messageInput.value = '';
                // Message will be added via WebSocket
            } else {
                throw new Error('Failed to send message');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message. Please try again.');
        }
    }

    handleNewMessage(message) {
        const channelMessages = this.messages.get(this.currentChannel) || [];
        channelMessages.push(message);
        this.messages.set(this.currentChannel, channelMessages);
        
        if (this.channelType === 'text') {
            const messageElement = this.createMessageElement(message);
            const messagesContainer = document.getElementById('messages-container');
            messagesContainer.appendChild(messageElement);
            this.scrollToBottom();
        }
    }

    switchChannel(channelElement) {
        // Remove active class from all channels
        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to selected channel
        channelElement.classList.add('active');

        // Update current channel
        this.currentChannel = channelElement.dataset.channelName || 'general';
        this.channelType = channelElement.dataset.channelType || 'text';

        // Update header
        this.updateChannelHeader();

        // Load messages for this channel
        if (this.channelType === 'text') {
            this.displayMessages();
        }
    }

    updateChannelHeader() {
        const channelIcon = document.getElementById('channel-icon');
        const channelName = document.getElementById('channel-name');
        const channelDescription = document.getElementById('channel-description');

        if (this.channelType === 'voice') {
            channelIcon.innerHTML = `<path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>`;
            channelDescription.textContent = 'Voice Channel';
        } else {
            channelIcon.innerHTML = `<path d="M5.8 21L7.4 14L2 9.2L9.2 8.6L12 2L14.8 8.6L22 9.2L18.8 12H18C17.3 12 16.6 12.1 15.9 12.4L18.1 10.5L13.7 10.1L12 6.1L10.3 10.1L5.9 10.5L9.2 13.4L8.2 17.7L12 15.4L12.5 15.7C12.3 16.2 12.1 16.8 12.1 17.3L5.8 21M17 14V17H14V19H17V22H19V19H22V17H19V14H17Z"/>`;
            channelDescription.textContent = 'Welcome to the server!';
        }

        channelName.textContent = this.currentChannel;
        
        // Update message input placeholder
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.placeholder = `Message #${this.currentChannel}`;
        }
    }

    toggleVoiceConnection(channelName) {
        if (this.voiceConnected) {
            this.disconnectVoice();
        } else {
            this.connectVoice(channelName);
        }
    }

    connectVoice(channelName) {
        // Implement voice connection logic here
        this.voiceConnected = true;
        this.updateVoiceUI();
        console.log(`Connected to voice channel: ${channelName}`);
    }

    disconnectVoice() {
        // Implement voice disconnection logic here
        this.voiceConnected = false;
        this.updateVoiceUI();
        console.log('Disconnected from voice channel');
    }

    updateVoiceUI() {
        const voiceChannels = document.querySelectorAll('[data-channel-type="voice"]');
        voiceChannels.forEach(channel => {
            if (this.voiceConnected) {
                channel.classList.add('voice-connected');
            } else {
                channel.classList.remove('voice-connected');
            }
        });
    }

    updateMembersList() {
        const onlineList = document.getElementById('online-members-list');
        const offlineList = document.getElementById('offline-members-list');
        
        onlineList.innerHTML = '';
        offlineList.innerHTML = '';

        this.members.forEach(member => {
            const memberElement = this.createMemberElement(member);
            if (member.status === 'online') {
                onlineList.appendChild(memberElement);
            } else {
                offlineList.appendChild(memberElement);
            }
        });
    }

    createMemberElement(member) {
        const memberDiv = document.createElement('div');
        memberDiv.className = 'flex items-center px-2 py-1 rounded hover:bg-gray-600 cursor-pointer';

        const isOnline = member.status === 'online';
        
        memberDiv.innerHTML = `
            <div class="user-avatar ${isOnline ? '' : 'offline'}">
                <img src="${member.avatar_url || `https://via.placeholder.com/32/5865f2/ffffff?text=${member.username.charAt(0).toUpperCase()}`}" 
                     alt="${member.username}" class="w-8 h-8 rounded-full">
            </div>
            <div class="ml-3 flex-1">
                <div class="text-sm font-medium">${member.username}</div>
                ${member.activity ? `<div class="text-xs" style="color: var(--discord-text-muted);">${member.activity}</div>` : ''}
            </div>
        `;

        return memberDiv;
    }

    updateMemberCounts() {
        const onlineCount = Array.from(this.members.values()).filter(m => m.status === 'online').length;
        const totalCount = this.members.size;
        
        document.getElementById('online-members-count').textContent = onlineCount;
        document.getElementById('offline-members-count').textContent = totalCount - onlineCount;
        document.getElementById('total-members').textContent = totalCount;
    }

    toggleMembersPanel() {
        const membersPanel = document.getElementById('members-sidebar');
        if (membersPanel.classList.contains('hidden')) {
            membersPanel.classList.remove('hidden');
            membersPanel.classList.add('flex');
        } else {
            membersPanel.classList.add('hidden');
            membersPanel.classList.remove('flex');
        }
    }

    startVoiceCall() {
        if (this.callManager) {
            this.callManager.initiateCall('voice');
        }
    }

    startVideoCall() {
        if (this.callManager) {
            this.callManager.initiateCall('video');
        }
    }

    toggleMute() {
        // Implement mute toggle
        console.log('Toggle mute');
    }

    toggleDeafen() {
        // Implement deafen toggle
        console.log('Toggle deafen');
    }

    openSettings() {
        // Implement settings modal
        console.log('Open settings');
    }

    initializeCallManager() {
        // Initialize call manager if available
        if (typeof CallManager !== 'undefined' && this.currentRoom) {
            this.callManager = new CallManager(this.currentRoom.id);
        }
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('messages-container');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    handleUserJoined(user) {
        this.members.set(user.id, user);
        this.updateMembersList();
        this.updateMemberCounts();
    }

    handleUserLeft(userId) {
        this.members.delete(userId);
        this.updateMembersList();
        this.updateMemberCounts();
    }

    handleVoiceStateUpdate(data) {
        // Handle voice state updates
        console.log('Voice state update:', data);
    }
}

// Initialize the Discord-style server interface
document.addEventListener('DOMContentLoaded', () => {
    new ChimeServer();
}); 