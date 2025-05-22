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
  async function fetchMessages() {
    try {
      messagesContainer.innerHTML = `<div class="flex items-center justify-center h-full text-gray-500">Loading messages...</div>`;
      
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
      
      messages = data.data;
      displayMessages();
      
      // TODO: Set up real-time updates with Supabase Realtime
      
    } catch (error) {
      messagesContainer.innerHTML = `<div class="flex items-center justify-center p-8 text-red-500">
        Error loading messages: ${error.message}. <button id="retry-fetch" class="ml-2 text-indigo-600 hover:underline">Retry</button>
      </div>`;
      
      document.getElementById('retry-fetch').addEventListener('click', fetchMessages);
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
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Function to send a message
  async function sendMessage(e) {
    e.preventDefault();
    
    const content = messageInput.value.trim();
    
    if (!content) {
      return;
    }
    
    try {
      // Clear input and disable form
      messageInput.value = '';
      messageInput.disabled = true;
      
      // Make API request
      const response = await fetch(`/api/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      
      // Re-enable input
      messageInput.disabled = false;
      messageInput.focus();
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to send message');
      }
      
      // Add message to UI (will be replaced by real-time updates later)
      messages.push(data.data);
      displayMessages();
      
    } catch (error) {
      alert(`Error sending message: ${error.message}`);
    }
  }

  // Function to display members modal
  function openMembersModal() {
    // Populate members list
    if (roomData && roomData.members) {
      const membersHTML = roomData.members.map(member => {
        const isCurrentUser = member.id === user.id;
        const isRoomAdmin = member.id === roomData.admin_id;
        
        return `<div class="flex justify-between items-center py-3 px-4">
          <div class="flex items-center">
            <div>
              <p class="text-sm font-medium text-gray-900">
                ${member.username} ${isCurrentUser ? '(You)' : ''}
              </p>
              ${isRoomAdmin ? '<span class="text-xs text-indigo-600">Admin</span>' : ''}
            </div>
          </div>
          ${isAdmin && !isCurrentUser ? `
            <button class="remove-member-button text-red-600 hover:text-red-900 text-xs" data-user-id="${member.id}">
              Remove
            </button>
          ` : ''}
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
    }
    
    membersModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
  }

  // Function to close members modal
  function closeMembersModal() {
    membersModal.classList.add('hidden');
    document.body.style.overflow = ''; // Re-enable scrolling
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