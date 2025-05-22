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
  const deleteRoomButton = document.getElementById('delete-room-button');
  const messagesContainer = document.getElementById('messages-container');
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  const membersModal = document.getElementById('members-modal');
  const closeMembersModalButton = document.getElementById('close-members-modal-button');
  const membersList = document.getElementById('members-list');
  const deleteRoomModal = document.getElementById('delete-room-modal');
  const closeDeleteModalButton = document.getElementById('close-delete-modal-button');
  const confirmDeleteButton = document.getElementById('confirm-delete-button');
  const cancelDeleteButton = document.getElementById('cancel-delete-button');
  const deleteRoomNameSpan = document.getElementById('delete-room-name');

  // Display username
  usernameDisplay.textContent = user.username;

  // Room and message data
  let roomData = null;
  let messages = [];
  let isAdmin = false;
  let lastMessageId = null;
  let isInitialLoad = true;

  // Initialize real-time connection
  initializeRealtime();

  // Fetch room details
  fetchRoomDetails();

  // Event listeners
  logoutButton.addEventListener('click', logout);
  roomMembersButton.addEventListener('click', openMembersModal);
  closeMembersModalButton.addEventListener('click', closeMembersModal);
  leaveRoomButton.addEventListener('click', leaveRoom);
  deleteRoomButton.addEventListener('click', openDeleteRoomModal);
  closeDeleteModalButton.addEventListener('click', closeDeleteRoomModal);
  confirmDeleteButton.addEventListener('click', confirmDeleteRoom);
  cancelDeleteButton.addEventListener('click', closeDeleteRoomModal);
  messageForm.addEventListener('submit', sendMessage);

  // Event listener for clicking outside the modal to close it
  window.addEventListener('click', (e) => {
    if (e.target === membersModal) {
      closeMembersModal();
    }
    if (e.target === deleteRoomModal) {
      closeDeleteRoomModal();
    }
  });

  // Initialize real-time messaging with faster polling
  function initializeRealtime() {
    setInterval(() => {
      if (roomData && !isInitialLoad) {
        fetchMessages(true); // Silent fetch for updates
      }
    }, 1500); // Check every 1.5 seconds for better real-time feel
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
      
      // Show/hide delete button based on admin status
      if (isAdmin) {
        deleteRoomButton.classList.remove('hidden');
      } else {
        deleteRoomButton.classList.add('hidden');
      }
      
      // Fetch messages for the first time
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
      
      const newMessages = data.data || [];
      
      if (isInitialLoad) {
        // First load - display all messages
        messages = newMessages;
        displayAllMessages();
        isInitialLoad = false;
        
        // Set last message ID for future comparisons
        if (newMessages.length > 0) {
          lastMessageId = newMessages[newMessages.length - 1].id;
        }
      } else if (silent) {
        // Check for new messages since last fetch
        const newerMessages = getNewerMessages(newMessages);
        if (newerMessages.length > 0) {
          // Add new messages to the array
          messages = [...messages, ...newerMessages];
          // Display only the new messages with animation
          displayNewMessages(newerMessages);
          // Update last message ID
          lastMessageId = messages[messages.length - 1].id;
        }
      }
      
    } catch (error) {
      if (!silent) {
        messagesContainer.innerHTML = `<div class="flex items-center justify-center p-8 text-red-500">
          Error loading messages: ${error.message}. <button id="retry-fetch" class="ml-2 text-indigo-600 hover:underline">Retry</button>
        </div>`;
        
        document.getElementById('retry-fetch')?.addEventListener('click', () => fetchMessages());
      }
      console.error('Error fetching messages:', error);
    }
  }

  // Function to get messages newer than the last known message
  function getNewerMessages(allMessages) {
    if (!lastMessageId || allMessages.length === 0) {
      return [];
    }
    
    const lastIndex = allMessages.findIndex(msg => msg.id === lastMessageId);
    if (lastIndex === -1) {
      // If last message ID not found, return all messages (fallback)
      return allMessages;
    }
    
    // Return messages after the last known message
    return allMessages.slice(lastIndex + 1);
  }

  // Function to display all messages (initial load)
  function displayAllMessages() {
    if (!messages || messages.length === 0) {
      messagesContainer.innerHTML = `<div class="flex items-center justify-center h-full text-gray-500">
        No messages yet. Be the first to send a message!
      </div>`;
      return;
    }
    
    const messagesHTML = messages.map(message => createMessageHTML(message)).join('');
    messagesContainer.innerHTML = messagesHTML;
    scrollToBottom();
  }

  // Function to display new messages with animation
  function displayNewMessages(newMessages) {
    newMessages.forEach(message => {
      const messageDiv = document.createElement('div');
      messageDiv.innerHTML = createMessageHTML(message);
      const messageElement = messageDiv.firstElementChild;
      
      // Set initial animation state
      messageElement.style.opacity = '0';
      messageElement.style.transform = 'translateY(20px)';
      
      // Add to container
      messagesContainer.appendChild(messageElement);
      
      // Trigger animation
      requestAnimationFrame(() => {
        messageElement.style.transition = 'all 0.3s ease-out';
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateY(0)';
      });
    });
    
    scrollToBottom();
  }

  // Function to create message HTML
  function createMessageHTML(message) {
    const isCurrentUser = message.sender_id === user.id;
    const bubbleClass = isCurrentUser ? 'outgoing' : 'incoming';
    const senderName = isCurrentUser ? 'You' : (message.users?.username || 'Unknown');
    const isTemp = message.id && message.id.toString().startsWith('temp-');
    const statusClass = isTemp ? 'sending' : '';
    
    return `<div class="message-bubble ${bubbleClass} ${statusClass}" data-message-id="${message.id}">
      <div class="message-content">${escapeHtml(message.content)}</div>
      <div class="message-meta">
        ${senderName} • ${formatDate(message.created_at)}
        ${isCurrentUser && isTemp ? '<span class="sending-indicator">⏳</span>' : ''}
        ${isCurrentUser && !isTemp ? '<span class="sent-indicator">✓</span>' : ''}
      </div>
    </div>`;
  }

  // Function to send a message (improved)
  async function sendMessage(e) {
    e.preventDefault();
    
    const content = messageInput.value.trim();
    
    if (!content) {
      return;
    }
    
    // Clear input immediately
    messageInput.value = '';
    
    // Create temporary message for instant UI update
    const tempId = 'temp-' + Date.now();
    const tempMessage = {
      id: tempId,
      content: content,
      sender_id: user.id,
      users: { username: user.username },
      created_at: new Date().toISOString()
    };
    
    // Add temp message to UI immediately
    addTempMessage(tempMessage);
    
    try {
      // Send to server
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
      replaceTempMessage(tempId, data.data);
      
    } catch (error) {
      // Remove temp message on error
      removeTempMessage(tempId);
      
      // Show error
      showErrorMessage(`Failed to send: ${error.message}`);
    }
  }

  // Function to add temporary message
  function addTempMessage(tempMessage) {
    const messageDiv = document.createElement('div');
    messageDiv.innerHTML = createMessageHTML(tempMessage);
    const messageElement = messageDiv.firstElementChild;
    
    // Set initial animation state
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(20px)';
    
    // Add to container
    messagesContainer.appendChild(messageElement);
    
    // Trigger animation
    requestAnimationFrame(() => {
      messageElement.style.transition = 'all 0.3s ease-out';
      messageElement.style.opacity = '1';
      messageElement.style.transform = 'translateY(0)';
    });
    
    scrollToBottom();
  }

  // Function to replace temporary message with real message
  function replaceTempMessage(tempId, realMessage) {
    const tempElement = document.querySelector(`[data-message-id="${tempId}"]`);
    if (tempElement) {
      // Update the message data
      tempElement.setAttribute('data-message-id', realMessage.id);
      tempElement.className = tempElement.className.replace('sending', '');
      
      // Update the content with real message data
      tempElement.innerHTML = createMessageHTML(realMessage).match(/<div class="message-bubble[^>]*"[^>]*>(.*)<\/div>/s)[1];
      
      // Update our messages array
      messages.push(realMessage);
      lastMessageId = realMessage.id;
    }
  }

  // Function to remove temporary message
  function removeTempMessage(tempId) {
    const tempElement = document.querySelector(`[data-message-id="${tempId}"]`);
    if (tempElement) {
      tempElement.style.transition = 'all 0.3s ease-out';
      tempElement.style.opacity = '0';
      tempElement.style.transform = 'translateX(-100%)';
      setTimeout(() => tempElement.remove(), 300);
    }
  }

  // Function to show error message
  function showErrorMessage(errorText) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message text-red-500 text-center py-2 mx-4 my-2';
    errorDiv.textContent = errorText;
    messagesContainer.appendChild(errorDiv);
    
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 3000);
  }

  // Function to scroll to bottom smoothly
  function scrollToBottom() {
    setTimeout(() => {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
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

  // Function to open delete room modal
  function openDeleteRoomModal() {
    if (!isAdmin) {
      alert('Only room admin can delete the room');
      return;
    }
    
    // Set room name in the modal
    deleteRoomNameSpan.textContent = roomData?.name || 'this room';
    
    deleteRoomModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  // Function to close delete room modal
  function closeDeleteRoomModal() {
    deleteRoomModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // Function to confirm room deletion
  async function confirmDeleteRoom() {
    try {
      // Show loading state
      confirmDeleteButton.disabled = true;
      confirmDeleteButton.textContent = 'Deleting...';
      
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete room');
      }
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete room');
      }
      
      // Show success message
      alert('Room deleted successfully');
      
      // Redirect to home page
      window.location.href = 'home.html';
      
    } catch (error) {
      // Reset button state
      confirmDeleteButton.disabled = false;
      confirmDeleteButton.textContent = 'Delete Room';
      
      // Show error
      alert(`Error deleting room: ${error.message}`);
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