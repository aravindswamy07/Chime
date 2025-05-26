// Discord-style Home JavaScript with Server Integration
class ChimeHome {
    constructor() {
        this.currentUser = null;
        this.conversations = new Map();
        this.friends = new Map();
        this.servers = new Map();
        this.currentConversation = null;
        this.currentServer = null;
        this.socket = null;
        this.isInDMMode = true;
        
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        this.connectWebSocket();
        await this.loadConversations();
        await this.loadFriends();
        await this.loadServers();
        this.updateUI();
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
            this.updateUserInfo();
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    }

    setupEventListeners() {
        // Server navigation
        document.getElementById('dm-server-icon').addEventListener('click', () => {
            this.switchToDMMode();
        });

        // Create room/server
        document.getElementById('create-room-button').addEventListener('click', () => {
            this.showCreateRoomModal();
        });

        document.getElementById('add-server-btn').addEventListener('click', () => {
            this.showCreateRoomModal();
        });

        // Create room modal
        document.getElementById('close-create-room-modal').addEventListener('click', () => {
            this.hideCreateRoomModal();
        });

        document.getElementById('cancel-create-room').addEventListener('click', () => {
            this.hideCreateRoomModal();
        });

        document.getElementById('create-room-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createRoom();
        });

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

        // Create DM
        document.getElementById('create-dm-button').addEventListener('click', () => {
            this.showCreateDMModal();
        });

        // Call buttons
        document.getElementById('voice-call-button').addEventListener('click', () => {
            this.startVoiceCall();
        });

        document.getElementById('video-call-button').addEventListener('click', () => {
            this.startVideoCall();
        });
    }

    connectWebSocket() {
        const token = localStorage.getItem('token');
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}?token=${token}`;
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            console.log('WebSocket connected');
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
            case 'conversation_updated':
                this.handleConversationUpdated(data.conversation);
                break;
            case 'friend_request':
                this.handleFriendRequest(data);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    async loadConversations() {
        try {
            const response = await fetch('/api/conversations', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                const conversations = result.data || [];
                
                conversations.forEach(conv => {
                    this.conversations.set(conv.id, conv);
                });
                
                this.updateConversationsList();
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    }

    async loadFriends() {
        try {
            const response = await fetch('/api/friends', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                const friends = result.data || [];
                
                friends.forEach(friend => {
                    this.friends.set(friend.id, friend);
                });
            }
        } catch (error) {
            console.error('Failed to load friends:', error);
        }
    }

    async loadServers() {
        try {
            const response = await fetch('/api/rooms', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                const servers = result.data || [];
                
                servers.forEach(server => {
                    this.servers.set(server.id, server);
                });
                
                this.updateServersList();
                this.updateServerIcons();
            }
        } catch (error) {
            console.error('Failed to load servers:', error);
        }
    }

    updateUserInfo() {
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

    updateConversationsList() {
        const dmList = document.getElementById('dm-list');
        dmList.innerHTML = '';

        this.conversations.forEach(conversation => {
            const dmElement = this.createConversationElement(conversation);
            dmList.appendChild(dmElement);
        });
    }

    updateServersList() {
        const serverList = document.getElementById('server-rooms-list');
        serverList.innerHTML = '';

        this.servers.forEach(server => {
            const serverElement = this.createServerElement(server);
            serverList.appendChild(serverElement);
        });
    }

    updateServerIcons() {
        const serverIconsList = document.getElementById('server-list');
        serverIconsList.innerHTML = '';

        this.servers.forEach(server => {
            const serverIcon = this.createServerIcon(server);
            serverIconsList.appendChild(serverIcon);
        });
    }

    createConversationElement(conversation) {
        const dmDiv = document.createElement('div');
        dmDiv.className = 'dm-item flex items-center px-2 py-2 rounded cursor-pointer';
        dmDiv.dataset.conversationId = conversation.id;

        const otherParticipant = conversation.participants?.find(p => p.id !== this.currentUser.id);
        const displayName = conversation.type === 'direct' ? 
            (otherParticipant?.username || 'Unknown User') : 
            conversation.name;

        const lastMessage = conversation.last_message;
        const timestamp = lastMessage ? 
            new Date(lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
            '';

        dmDiv.innerHTML = `
            <div class="user-avatar">
                <img src="${otherParticipant?.avatar_url || `https://via.placeholder.com/32/5865f2/ffffff?text=${displayName.charAt(0).toUpperCase()}`}" 
                     alt="${displayName}" class="w-8 h-8 rounded-full">
            </div>
            <div class="flex-1 min-w-0 ml-3">
                <div class="flex items-center justify-between">
                    <span class="text-sm font-medium truncate">${displayName}</span>
                    ${timestamp ? `<span class="text-xs" style="color: var(--discord-text-muted);">${timestamp}</span>` : ''}
                </div>
                ${lastMessage ? `<div class="text-xs truncate" style="color: var(--discord-text-secondary);">${lastMessage.content || 'File attachment'}</div>` : ''}
            </div>
        `;

        dmDiv.addEventListener('click', () => {
            this.selectConversation(conversation.id);
        });

        return dmDiv;
    }

    createServerElement(server) {
        const serverDiv = document.createElement('div');
        serverDiv.className = 'server-item flex items-center px-2 py-2 rounded cursor-pointer';
        serverDiv.dataset.serverId = server.id;

        serverDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3" style="background-color: var(--discord-accent);">
                ${server.name.charAt(0).toUpperCase()}
            </div>
            <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">${server.name}</div>
                <div class="text-xs" style="color: var(--discord-text-secondary);">${server.member_count || 0} members</div>
            </div>
        `;

        serverDiv.addEventListener('click', () => {
            this.joinServer(server.id);
        });

        return serverDiv;
    }

    createServerIcon(server) {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'server-icon relative w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg cursor-pointer transition-all duration-200';
        iconDiv.style.backgroundColor = 'var(--discord-accent)';
        iconDiv.dataset.serverId = server.id;
        iconDiv.textContent = server.name.charAt(0).toUpperCase();
        iconDiv.title = server.name;

        iconDiv.addEventListener('click', () => {
            this.selectServer(server.id);
        });

        return iconDiv;
    }

    switchToDMMode() {
        this.isInDMMode = true;
        this.currentServer = null;
        
        // Update active states
        document.querySelectorAll('.server-icon').forEach(icon => {
            icon.classList.remove('active');
        });
        document.getElementById('dm-server-icon').classList.add('active');
        
        // Update header
        document.getElementById('chat-title').textContent = 'Select a conversation';
        
        // Hide call buttons
        document.getElementById('voice-call-button').classList.add('hidden');
        document.getElementById('video-call-button').classList.add('hidden');
        
        // Clear messages
        this.clearMessages();
        this.showWelcomeMessage();
    }

    selectServer(serverId) {
        this.isInDMMode = false;
        this.currentServer = this.servers.get(serverId);
        
        // Update active states
        document.querySelectorAll('.server-icon').forEach(icon => {
            icon.classList.remove('active');
        });
        document.querySelector(`[data-server-id="${serverId}"]`).classList.add('active');
        
        // Navigate to server chatroom
        this.joinServer(serverId);
    }

    joinServer(serverId) {
        // Navigate to the Discord-style chatroom for this server
        window.location.href = `chatroom.html?id=${serverId}`;
    }

    async selectConversation(conversationId) {
        this.currentConversation = this.conversations.get(conversationId);
        
        if (!this.currentConversation) return;

        // Update active states
        document.querySelectorAll('.dm-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-conversation-id="${conversationId}"]`).classList.add('active');

        // Update header
        const otherParticipant = this.currentConversation.participants?.find(p => p.id !== this.currentUser.id);
        const displayName = this.currentConversation.type === 'direct' ? 
            (otherParticipant?.username || 'Unknown User') : 
            this.currentConversation.name;
        
        document.getElementById('chat-title').textContent = displayName;
        
        // Show call buttons for DMs
        document.getElementById('voice-call-button').classList.remove('hidden');
        document.getElementById('video-call-button').classList.remove('hidden');
        
        // Show message input
        document.getElementById('message-input-area').classList.remove('hidden');
        
        // Load and display messages
        await this.loadConversationMessages(conversationId);
    }

    async loadConversationMessages(conversationId) {
        try {
            const response = await fetch(`/api/conversations/${conversationId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                const messages = result.data || [];
                this.displayMessages(messages);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }

    displayMessages(messages) {
        const messagesContainer = document.getElementById('messages-container');
        const welcomeMessage = document.getElementById('welcome-message');
        
        // Hide welcome message
        welcomeMessage.style.display = 'none';
        
        // Clear existing messages
        const existingMessages = messagesContainer.querySelectorAll('.message-bubble');
        existingMessages.forEach(msg => msg.remove());

        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });

        this.scrollToBottom();
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-bubble flex items-start space-x-3 p-2 rounded hover:bg-gray-800 hover:bg-opacity-30';

        const isCurrentUser = message.user_id === this.currentUser.id;
        const user = isCurrentUser ? this.currentUser : { username: message.username || 'Unknown User' };

        const timestamp = new Date(message.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageDiv.innerHTML = `
            <div class="user-avatar">
                <img src="${user.avatar_url || `https://via.placeholder.com/40/5865f2/ffffff?text=${user.username.charAt(0).toUpperCase()}`}" 
                     alt="${user.username}" class="w-10 h-10 rounded-full">
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-baseline space-x-2">
                    <span class="text-sm font-semibold">${user.username}</span>
                    <span class="text-xs" style="color: var(--discord-text-muted);">${timestamp}</span>
                </div>
                <div class="text-sm mt-1" style="color: var(--discord-text-primary);">
                    ${this.formatMessageContent(message.content)}
                </div>
            </div>
        `;
        
        return messageDiv;
    }

    formatMessageContent(content) {
        if (!content) return '';
        
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code style="background-color: var(--discord-bg-tertiary); padding: 2px 4px; border-radius: 3px;">$1</code>')
            .replace(/~~(.*?)~~/g, '<del>$1</del>');
    }

    async sendMessage() {
        const messageInput = document.getElementById('message-input');
        const content = messageInput.value.trim();
        
        if (!content || !this.currentConversation) return;

        try {
            const response = await fetch(`/api/conversations/${this.currentConversation.id}/messages`, {
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

    async createRoom() {
        const formData = new FormData(document.getElementById('create-room-form'));
        const roomData = {
            name: formData.get('name'),
            description: formData.get('description') || null
        };

        try {
            const response = await fetch('/api/rooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(roomData)
            });

            if (response.ok) {
                const result = await response.json();
                const newRoom = result.data;
                
                this.servers.set(newRoom.id, newRoom);
                this.updateServersList();
                this.updateServerIcons();
                this.hideCreateRoomModal();
                
                // Navigate to the new server
                this.joinServer(newRoom.id);
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to create server');
            }
        } catch (error) {
            console.error('Failed to create room:', error);
            alert('Failed to create server. Please try again.');
        }
    }

    showCreateRoomModal() {
        document.getElementById('create-room-modal').classList.remove('hidden');
        document.getElementById('room-name').focus();
    }

    hideCreateRoomModal() {
        document.getElementById('create-room-modal').classList.add('hidden');
        document.getElementById('create-room-form').reset();
    }

    showCreateDMModal() {
        // Implement create DM modal functionality
        console.log('Create DM modal - to be implemented');
    }

    startVoiceCall() {
        if (this.currentConversation) {
            console.log('Starting voice call for conversation:', this.currentConversation.id);
            // Implement voice call functionality
        }
    }

    startVideoCall() {
        if (this.currentConversation) {
            console.log('Starting video call for conversation:', this.currentConversation.id);
            // Implement video call functionality
        }
    }

    clearMessages() {
        const messagesContainer = document.getElementById('messages-container');
        const existingMessages = messagesContainer.querySelectorAll('.message-bubble');
        existingMessages.forEach(msg => msg.remove());
    }

    showWelcomeMessage() {
        document.getElementById('welcome-message').style.display = 'flex';
        document.getElementById('message-input-area').classList.add('hidden');
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('messages-container');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    updateUI() {
        // Initial UI state
        this.showWelcomeMessage();
    }

    handleNewMessage(message) {
        if (this.currentConversation && message.conversation_id === this.currentConversation.id) {
            const messageElement = this.createMessageElement(message);
            const messagesContainer = document.getElementById('messages-container');
            messagesContainer.appendChild(messageElement);
            this.scrollToBottom();
        }
        
        // Update conversation in sidebar
        this.updateConversationInList(message.conversation_id);
    }

    handleConversationUpdated(conversation) {
        this.conversations.set(conversation.id, conversation);
        this.updateConversationsList();
    }

    updateConversationInList(conversationId) {
        // Reload conversations to get updated last message
        this.loadConversations();
    }

    handleFriendRequest(data) {
        // Handle friend request notifications
        console.log('Friend request received:', data);
    }
}

// Initialize the Discord-style home interface
document.addEventListener('DOMContentLoaded', () => {
    new ChimeHome();
}); 