// Discord-like Home Page JavaScript
class ChimeHome {
    constructor() {
        this.currentUser = null;
        this.currentConversation = null;
        this.conversations = new Map();
        this.friends = new Map();
        this.socket = null;
        this.selectedFriends = new Set();
        
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        this.connectWebSocket();
        await this.loadUserData();
        await this.loadConversations();
        await this.loadFriends();
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
        // Create DM Modal
        document.getElementById('create-dm-button').addEventListener('click', () => {
            this.showCreateDMModal();
        });

        document.getElementById('close-create-dm-modal').addEventListener('click', () => {
            this.hideCreateDMModal();
        });

        document.getElementById('cancel-create-dm').addEventListener('click', () => {
            this.hideCreateDMModal();
        });

        document.getElementById('create-dm-confirm').addEventListener('click', () => {
            this.createDirectMessage();
        });

        // Search functionality
        document.getElementById('dm-search').addEventListener('input', (e) => {
            this.searchConversations(e.target.value);
        });

        document.getElementById('friend-search').addEventListener('input', (e) => {
            this.searchFriends(e.target.value);
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

        // Settings button
        document.getElementById('settings-button').addEventListener('click', () => {
            this.showSettings();
        });

        // Call buttons
        document.querySelector('[title="Start Voice Call"]').addEventListener('click', () => {
            this.startVoiceCall();
        });

        document.querySelector('[title="Start Video Call"]').addEventListener('click', () => {
            this.startVideoCall();
        });

        document.querySelector('[title="Show Member List"]').addEventListener('click', () => {
            this.toggleUserProfile();
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
            // Attempt to reconnect after 3 seconds
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
            case 'user_status_update':
                this.updateUserStatus(data.userId, data.status);
                break;
            case 'conversation_update':
                this.updateConversation(data.conversation);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    async loadUserData() {
        if (this.currentUser) {
            document.getElementById('current-username').textContent = this.currentUser.username;
            
            // Set user avatar
            const avatar = document.getElementById('current-user-avatar');
            if (this.currentUser.avatar_url) {
                avatar.src = this.currentUser.avatar_url;
            } else {
                avatar.src = `https://via.placeholder.com/32/5865f2/ffffff?text=${this.currentUser.username.charAt(0).toUpperCase()}`;
            }
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
                const conversations = await response.json();
                this.displayConversations(conversations);
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
                const friends = await response.json();
                friends.forEach(friend => {
                    this.friends.set(friend.id, friend);
                });
            }
        } catch (error) {
            console.error('Failed to load friends:', error);
        }
    }

    displayConversations(conversations) {
        const dmList = document.getElementById('dm-list');
        dmList.innerHTML = '';

        conversations.forEach(conversation => {
            this.conversations.set(conversation.id, conversation);
            const dmItem = this.createConversationItem(conversation);
            dmList.appendChild(dmItem);
        });
    }

    createConversationItem(conversation) {
        const dmItem = document.createElement('div');
        dmItem.className = 'dm-item flex items-center px-2 py-2 rounded cursor-pointer';
        dmItem.dataset.conversationId = conversation.id;

        const otherUser = conversation.participants.find(p => p.id !== this.currentUser.id);
        const isOnline = otherUser?.status === 'online';

        dmItem.innerHTML = `
            <div class="user-avatar ${isOnline ? '' : 'offline'}">
                <img src="${otherUser?.avatar_url || `https://via.placeholder.com/32/5865f2/ffffff?text=${otherUser?.username?.charAt(0).toUpperCase() || 'U'}`}" 
                     alt="${otherUser?.username || 'User'}" class="w-8 h-8 rounded-full">
            </div>
            <div class="ml-3 flex-1 min-w-0">
                <div class="text-sm font-medium truncate">${otherUser?.username || 'Unknown User'}</div>
                ${conversation.last_message ? `
                    <div class="text-xs truncate" style="color: var(--discord-text-muted);">
                        ${conversation.last_message.content}
                    </div>
                ` : ''}
            </div>
            ${conversation.unread_count > 0 ? `
                <div class="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" 
                     style="background-color: var(--discord-red);">
                    ${conversation.unread_count}
                </div>
            ` : ''}
        `;

        dmItem.addEventListener('click', () => {
            this.selectConversation(conversation.id);
        });

        return dmItem;
    }

    async selectConversation(conversationId) {
        // Remove active class from all items
        document.querySelectorAll('.dm-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to selected item
        const selectedItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }

        this.currentConversation = this.conversations.get(conversationId);
        
        if (this.currentConversation) {
            await this.loadConversationMessages(conversationId);
            this.updateChatHeader();
            this.showMessageInput();
            this.showUserProfile();
        }
    }

    async loadConversationMessages(conversationId) {
        try {
            const response = await fetch(`/api/conversations/${conversationId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const messages = await response.json();
                this.displayMessages(messages);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }

    displayMessages(messages) {
        const messagesContainer = document.getElementById('messages-container');
        const welcomeMessage = document.getElementById('welcome-message');
        
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }

        messagesContainer.innerHTML = '';

        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-bubble flex items-start space-x-3 p-2 rounded hover:bg-gray-800 hover:bg-opacity-30';

        const isCurrentUser = message.user_id === this.currentUser.id;
        const user = isCurrentUser ? this.currentUser : 
                    this.currentConversation.participants.find(p => p.id === message.user_id);

        const timestamp = new Date(message.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

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
                <div class="text-sm mt-1" style="color: var(--discord-text-primary);">
                    ${this.formatMessageContent(message.content)}
                </div>
            </div>
        `;

        return messageDiv;
    }

    formatMessageContent(content) {
        // Basic message formatting (you can extend this)
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code style="background-color: var(--discord-bg-tertiary); padding: 2px 4px; border-radius: 3px;">$1</code>');
    }

    updateChatHeader() {
        if (this.currentConversation) {
            const otherUser = this.currentConversation.participants.find(p => p.id !== this.currentUser.id);
            const chatTitle = document.getElementById('chat-title');
            chatTitle.textContent = otherUser?.username || 'Unknown User';
        }
    }

    showMessageInput() {
        const messageInputContainer = document.getElementById('message-input-container');
        messageInputContainer.classList.remove('hidden');
        
        const messageInput = document.getElementById('message-input');
        if (this.currentConversation) {
            const otherUser = this.currentConversation.participants.find(p => p.id !== this.currentUser.id);
            messageInput.placeholder = `Message @${otherUser?.username || 'user'}`;
        }
    }

    showUserProfile() {
        if (this.currentConversation) {
            const otherUser = this.currentConversation.participants.find(p => p.id !== this.currentUser.id);
            const profileSidebar = document.getElementById('user-profile-sidebar');
            
            // Update profile information
            document.getElementById('profile-username').textContent = otherUser?.username || 'Unknown User';
            document.getElementById('profile-discriminator').textContent = otherUser?.email || 'user@example.com';
            
            const profileAvatar = document.getElementById('profile-avatar');
            profileAvatar.src = otherUser?.avatar_url || 
                `https://via.placeholder.com/80/5865f2/ffffff?text=${otherUser?.username?.charAt(0).toUpperCase() || 'U'}`;
            
            // Show member since date
            if (otherUser?.created_at) {
                const memberSince = new Date(otherUser.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                document.getElementById('profile-member-since').textContent = memberSince;
            }
            
            profileSidebar.classList.remove('hidden');
            profileSidebar.classList.add('flex');
        }
    }

    toggleUserProfile() {
        const profileSidebar = document.getElementById('user-profile-sidebar');
        if (profileSidebar.classList.contains('hidden')) {
            this.showUserProfile();
        } else {
            profileSidebar.classList.add('hidden');
            profileSidebar.classList.remove('flex');
        }
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

    handleNewMessage(message) {
        if (this.currentConversation && message.conversation_id === this.currentConversation.id) {
            const messagesContainer = document.getElementById('messages-container');
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // Update conversation list
        this.updateConversationLastMessage(message);
    }

    updateConversationLastMessage(message) {
        const conversation = this.conversations.get(message.conversation_id);
        if (conversation) {
            conversation.last_message = message;
            if (message.user_id !== this.currentUser.id) {
                conversation.unread_count = (conversation.unread_count || 0) + 1;
            }
            
            // Update the conversation item in the list
            const conversationItem = document.querySelector(`[data-conversation-id="${message.conversation_id}"]`);
            if (conversationItem) {
                // Re-create the conversation item with updated data
                const newItem = this.createConversationItem(conversation);
                conversationItem.replaceWith(newItem);
            }
        }
    }

    showCreateDMModal() {
        document.getElementById('create-dm-modal').classList.remove('hidden');
        this.populateFriendsList();
    }

    hideCreateDMModal() {
        document.getElementById('create-dm-modal').classList.add('hidden');
        this.selectedFriends.clear();
        document.getElementById('friend-search').value = '';
    }

    populateFriendsList() {
        const friendsList = document.getElementById('friends-list');
        friendsList.innerHTML = '';

        this.friends.forEach(friend => {
            const friendItem = this.createFriendItem(friend);
            friendsList.appendChild(friendItem);
        });
    }

    createFriendItem(friend) {
        const friendItem = document.createElement('div');
        friendItem.className = 'flex items-center p-2 rounded hover:bg-gray-600 cursor-pointer';
        friendItem.dataset.friendId = friend.id;

        friendItem.innerHTML = `
            <div class="user-avatar ${friend.status === 'online' ? '' : 'offline'}">
                <img src="${friend.avatar_url || `https://via.placeholder.com/32/5865f2/ffffff?text=${friend.username.charAt(0).toUpperCase()}`}" 
                     alt="${friend.username}" class="w-8 h-8 rounded-full">
            </div>
            <div class="ml-3 flex-1">
                <div class="text-sm font-medium">${friend.username}</div>
                <div class="text-xs" style="color: var(--discord-text-muted);">${friend.status || 'offline'}</div>
            </div>
            <div class="friend-checkbox w-5 h-5 border-2 rounded" style="border-color: var(--discord-border);"></div>
        `;

        friendItem.addEventListener('click', () => {
            this.toggleFriendSelection(friend.id, friendItem);
        });

        return friendItem;
    }

    toggleFriendSelection(friendId, friendItem) {
        const checkbox = friendItem.querySelector('.friend-checkbox');
        
        if (this.selectedFriends.has(friendId)) {
            this.selectedFriends.delete(friendId);
            checkbox.style.backgroundColor = 'transparent';
            checkbox.innerHTML = '';
        } else {
            this.selectedFriends.add(friendId);
            checkbox.style.backgroundColor = 'var(--discord-accent)';
            checkbox.innerHTML = '<svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
        }
    }

    async createDirectMessage() {
        if (this.selectedFriends.size === 0) {
            alert('Please select at least one friend.');
            return;
        }

        try {
            const response = await fetch('/api/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    participants: Array.from(this.selectedFriends),
                    type: this.selectedFriends.size === 1 ? 'direct' : 'group'
                })
            });

            if (response.ok) {
                const conversation = await response.json();
                this.conversations.set(conversation.id, conversation);
                
                // Add to conversation list
                const dmList = document.getElementById('dm-list');
                const conversationItem = this.createConversationItem(conversation);
                dmList.insertBefore(conversationItem, dmList.firstChild);
                
                // Select the new conversation
                this.selectConversation(conversation.id);
                this.hideCreateDMModal();
            } else {
                throw new Error('Failed to create conversation');
            }
        } catch (error) {
            console.error('Failed to create DM:', error);
            alert('Failed to create direct message. Please try again.');
        }
    }

    searchConversations(query) {
        const dmItems = document.querySelectorAll('.dm-item');
        dmItems.forEach(item => {
            const username = item.querySelector('.text-sm.font-medium').textContent.toLowerCase();
            if (username.includes(query.toLowerCase())) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    searchFriends(query) {
        const friendItems = document.querySelectorAll('#friends-list > div');
        friendItems.forEach(item => {
            const username = item.querySelector('.text-sm.font-medium').textContent.toLowerCase();
            if (username.includes(query.toLowerCase())) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    startVoiceCall() {
        if (this.currentConversation) {
            // Redirect to call interface or open call modal
            console.log('Starting voice call...');
            // You can integrate with your existing call system here
        }
    }

    startVideoCall() {
        if (this.currentConversation) {
            // Redirect to call interface or open call modal
            console.log('Starting video call...');
            // You can integrate with your existing call system here
        }
    }

    showSettings() {
        // Open settings modal or redirect to settings page
        console.log('Opening settings...');
    }

    updateUserStatus(userId, status) {
        // Update user status in conversations and friends
        this.friends.forEach(friend => {
            if (friend.id === userId) {
                friend.status = status;
            }
        });

        // Update avatar status indicators
        document.querySelectorAll(`[data-user-id="${userId}"] .user-avatar`).forEach(avatar => {
            if (status === 'online') {
                avatar.classList.remove('offline');
            } else {
                avatar.classList.add('offline');
            }
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChimeHome();
}); 