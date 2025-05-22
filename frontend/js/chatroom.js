// Chat room page JavaScript

document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token || !user.id) {
    window.location.href = 'index.html';
    return;
  }

  // Get room ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('id');
  
  if (!roomId) {
    window.location.href = 'home.html';
    return;
  }

  // DOM elements
  const usernameDisplay = document.getElementById('username-display');
  const logoutButton = document.getElementById('logout-button');
  const roomName = document.getElementById('room-name');
  const roomDescription = document.getElementById('room-description');
  const memberCount = document.getElementById('member-count');
  const maxMembers = document.getElementById('max-members');
  const roomMembersButton = document.getElementById('room-members-button');
  const leaveRoomButton = document.getElementById('leave-room-button');
  const messagesContainer = document.getElementById('messages-container');
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  const membersModal = document.getElementById('members-modal');
  const closeMembersModalButton = document.getElementById('close-members-modal-button');
  const membersList = document.getElementById('members-list');

  // Display username
  usernameDisplay.textContent = user.username;

  // Room and message data
  let roomData = null;
  let messages = [];
  let isAdmin = false;
  let realtimeChannel = null;

  // Initialize Supabase client for real-time
  const supabaseUrl = 'https://your-project.supabase.co'; // This will be replaced with actual URL
  const supabaseKey = 'your-anon-key'; // This will be replaced with actual key
  
  // Initialize real-time connection
  initializeRealtime();

  // Fetch room details
  fetchRoomDetails();

  // Event listeners
  logoutButton.addEventListener('click', logout);
  roomMembersButton.addEventListener('click', openMembersModal);
  closeMembersModalButton.addEventListener('click', closeMembersModal);
  leaveRoomButton.addEventListener('click', leaveRoom);
  messageForm.addEventListener('submit', sendMessage);

  // Event listener for clicking outside the modal to close it
  window.addEventListener('click', (e) => {
    if (e.target === membersModal) {
      closeMembersModal();
    }
  });

  // Initialize real-time messaging
  function initializeRealtime() {
    // For now, we'll use polling as a fallback
    // In production, you'd use Supabase Realtime
    setInterval(() => {
      if (roomData) {
        fetchMessages(true); // Silent fetch
      }
    }, 3000); // Check for new messages every 3 seconds
  }

  // Function to fetch room details
  async function fetchRoomDetails() {
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch room details');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch room details');
      }
      
      roomData = data.data;
      
      // Display room details
      roomName.textContent = roomData.name;
      roomDescription.textContent = roomData.description || 'No description';
      memberCount.textContent = roomData.members.length;
      maxMembers.textContent = roomData.max_members;
      
      // Check if user is admin
      isAdmin = roomData.admin_id === user.id;
      
      // Fetch messages
      fetchMessages();
      
    } catch (error) {
      alert(`Error loading room: ${error.message}`);
      window.location.href = 'home.html';
    }
  }

  // Function to fetch messages
  async function fetchMessages(silent = false) {
    try {
      if (!silent) {
        messagesContainer.innerHTML = `<div class="flex items-center justify-center h-full text-gray-500">Loading messages...</div>`;
      }
      
      const response = await fetch(`/api/rooms/${roomId}/messages/recent`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch messages');
      }
      
      const newMessages = data.data;
      
      // Only update if there are new messages
      if (!silent || newMessages.length !== messages.length) {
        messages = newMessages;
        displayMessages();
      }
      
    } catch (error) {
      if (!silent) {
        messagesContainer.innerHTML = `<div class="flex items-center justify-center p-8 text-red-500">
          Error loading messages: ${error.message}. <button id="retry-fetch" class="ml-2 text-indigo-600 hover:underline">Retry</button>
        </div>`;
        
        document.getElementById('retry-fetch')?.addEventListener('click', () => fetchMessages());
      }
    }
  }

  // Function to display messages
  function displayMessages() {
    if (!messages || messages.length === 0) {
      messagesContainer.innerHTML = `<div class="flex items-center justify-center h-full text-gray-500">
        No messages yet. Be the first to send a message!
      </div>`;
      return;
    }
    
    // Store scroll position
    const wasScrolledToBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight <= messagesContainer.scrollTop + 1;
    
    const messagesHTML = messages.map(message => {
      const isCurrentUser = message.sender_id === user.id;
      const bubbleClass = isCurrentUser ? 'outgoing' : 'incoming';
      const senderName = isCurrentUser ? 'You' : (message.users?.username || 'Unknown');
      
      return `<div class="message-bubble ${bubbleClass} fade-in">
        <div class="message-content">${escapeHtml(message.content)}</div>
        <div class="message-meta">
          ${senderName} • ${formatDate(message.created_at)}
        </div>
      </div>`;
    }).join('');
    
    messagesContainer.innerHTML = messagesHTML;
    
    // Maintain scroll position or scroll to bottom if user was at bottom
    if (wasScrolledToBottom) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Function to send a message (optimized)
  async function sendMessage(e) {
    e.preventDefault();
    
    const content = messageInput.value.trim();
    
    if (!content) {
      return;
    }
    
    // Optimistic update - add message to UI immediately
    const tempMessage = {
      id: 'temp-' + Date.now(),
      content: content,
      sender_id: user.id,
      users: { username: user.username },
      created_at: new Date().toISOString(),
      sending: true
    };
    
    messages.push(tempMessage);
    displayMessages();
    
    // Clear input immediately for better UX
    messageInput.value = '';
    
    try {
      // Make API request
      const response = await fetch(`/api/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to send message');
      }
      
      // Replace temp message with real message
      const tempIndex = messages.findIndex(m => m.id === tempMessage.id);
      if (tempIndex !== -1) {
        messages[tempIndex] = data.data;
        displayMessages();
      }
      
      // Refresh messages to get any new ones from other users
      setTimeout(() => fetchMessages(true), 500);
      
    } catch (error) {
      // Remove temp message on error
      messages = messages.filter(m => m.id !== tempMessage.id);
      displayMessages();
      alert(`Error sending message: ${error.message}`);
    }
  }

  // Function to open members modal
  function openMembersModal() {
    if (!roomData || !roomData.members) {
      return;
    }
    
    const membersHTML = roomData.members.map(member => {
      const isCurrentUser = member.id === user.id;
      const isRoomAdmin = member.id === roomData.admin_id;
      
      return `<div class="member-item flex justify-between items-center p-3 border-b border-gray-200">
        <div>
          <span class="font-medium">${member.username}</span>
          ${isRoomAdmin ? '<span class="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Admin</span>' : ''}
          ${isCurrentUser ? '<span class="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">You</span>' : ''}
        </div>
        ${(isAdmin && !isCurrentUser && !isRoomAdmin) ? 
          `<button class="remove-member-button text-red-600 hover:text-red-800 text-sm" data-user-id="${member.id}">
            Remove
          </button>` : ''
        }
      </div>`;
    }).join('');
    
    membersList.innerHTML = membersHTML;
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-member-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const userId = e.target.dataset.userId;
        removeMember(userId);
      });
    });
    
    membersModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  // Function to close members modal
  function closeMembersModal() {
    membersModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // Function to leave room
  async function leaveRoom() {
    if (!confirm('Are you sure you want to leave this room?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to leave room');
      }
      
      // Redirect to home page
      window.location.href = 'home.html';
      
    } catch (error) {
      alert(`Error leaving room: ${error.message}`);
    }
  }

  // Function to remove a member (admin only)
  async function removeMember(userId) {
    if (!confirm('Are you sure you want to remove this user from the room?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/rooms/${roomId}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove user');
      }
      
      // Close modal and refresh room details
      closeMembersModal();
      fetchRoomDetails();
      
    } catch (error) {
      alert(`Error removing user: ${error.message}`);
    }
  }

  // Helper function to format date
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Helper function to escape HTML
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Function to handle logout
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  }
}); 