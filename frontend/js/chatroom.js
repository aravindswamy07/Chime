// Chat room page JavaScript - Clean Telegram-style implementation

// Theme management
let isDarkMode = localStorage.getItem('darkMode') === 'true' || true;

function toggleTheme() {
  isDarkMode = !isDarkMode;
  localStorage.setItem('darkMode', isDarkMode.toString());
  updateTheme();
}

function updateTheme() {
  const body = document.body;
  const themeToggle = document.getElementById('theme-toggle');
  
  if (isDarkMode) {
    body.classList.remove('light-mode');
    body.classList.add('dark-mode');
    if (themeToggle) {
      themeToggle.innerHTML = `
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      `;
    }
  } else {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
    if (themeToggle) {
      themeToggle.innerHTML = `
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      `;
    }
  }
}

// File size formatter
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get file icon based on type
function getFileIcon(fileType) {
  if (fileType.startsWith('image/')) {
    return `<svg class="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>`;
  } else if (fileType === 'application/pdf') {
    return `<svg class="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>`;
  } else if (fileType.includes('video/')) {
    return `<svg class="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>`;
  } else if (fileType.includes('audio/')) {
    return `<svg class="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>`;
  } else {
    return `<svg class="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>`;
  }
}

// Simple file upload to Supabase Storage
async function uploadFileToSupabase(file, roomId, token) {
  const maxFileSize = 500 * 1024 * 1024; // 500MB limit
  
  if (file.size > maxFileSize) {
    throw new Error('File size exceeds 500MB limit');
  }
  
  // Create FormData for upload
  const formData = new FormData();
  formData.append('file', file);
  formData.append('roomId', roomId);
  
  // Upload to Supabase via backend API
  const response = await fetch(`/api/upload/file`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message || 'Upload failed');
  }
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Upload failed');
  }
  
  return result.data; // Returns { url, fileName, fileSize, fileType }
}

// Send file message
async function sendFileMessage(roomId, fileData, caption, token) {
  const response = await fetch(`/api/rooms/${roomId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      type: 'file',
      content: caption || null,
      file_name: fileData.fileName,
      file_size: fileData.fileSize,
      file_type: fileData.fileType,
      file_url: fileData.url
    })
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to send file message');
  }
  
  return result.data;
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize theme
  updateTheme();
  
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
  const themeToggle = document.getElementById('theme-toggle');
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
  const fileInput = document.getElementById('file-input');
  const fileButton = document.getElementById('file-button');
  const membersModal = document.getElementById('members-modal');
  const closeMembersModalButton = document.getElementById('close-members-modal-button');
  const membersList = document.getElementById('members-list');

  // Room and message data
  let roomData = null;
  let messages = [];
  let isAdmin = false;

  // Display username
  usernameDisplay.textContent = user.username;

  // Event listeners
  themeToggle.addEventListener('click', toggleTheme);
  logoutButton.addEventListener('click', logout);
  roomMembersButton.addEventListener('click', openMembersModal);
  closeMembersModalButton.addEventListener('click', closeMembersModal);
  leaveRoomButton.addEventListener('click', leaveRoom);
  deleteRoomButton.addEventListener('click', deleteRoom);
  messageForm.addEventListener('submit', sendMessage);
  fileButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileUpload);

  // Initialize
  fetchRoomDetails();
  initializeRealtime();

  // Function to fetch room details
  async function fetchRoomDetails() {
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
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
      deleteRoomButton.style.display = isAdmin ? 'block' : 'none';
      
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
      const response = await fetch(`/api/rooms/${roomId}/messages/recent`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch messages');
      }
      
      messages = data.data || [];
      displayMessages();
      
    } catch (error) {
      messagesContainer.innerHTML = `<div class="flex items-center justify-center p-8 text-red-500">
        Error loading messages: ${error.message}. <button onclick="location.reload()" class="ml-2 text-indigo-600 hover:underline">Retry</button>
      </div>`;
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
    
    const messagesHTML = messages.map(message => createMessageHTML(message)).join('');
    messagesContainer.innerHTML = messagesHTML;
    scrollToBottom();
  }

  // Function to create message HTML
  function createMessageHTML(message) {
    const isCurrentUser = message.sender_id === user.id;
    const bubbleClass = isCurrentUser ? 'outgoing' : 'incoming';
    const senderName = isCurrentUser ? 'You' : (message.users?.username || 'Unknown');
    
    // Handle file messages
    if (message.message_type === 'file' && message.file_name) {
      const fileIcon = getFileIcon(message.file_type);
      const isImage = message.file_type && message.file_type.startsWith('image/');
      
      return `<div class="message-bubble ${bubbleClass}">
        <div class="file-message">
          ${isImage ? 
            `<div class="image-preview mb-2">
              <img src="${message.file_url}" alt="${message.file_name}" 
                class="max-w-xs max-h-64 rounded-lg cursor-pointer hover:opacity-80" 
                onclick="window.open('${message.file_url}', '_blank')">
            </div>` :
            `<div class="file-info flex items-center space-x-3 mb-2 p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all">
              <div class="file-icon">${fileIcon}</div>
              <div class="flex-1">
                <div class="file-name font-medium">${message.file_name}</div>
                <div class="file-size text-xs opacity-75">${formatFileSize(message.file_size || 0)}</div>
              </div>
              <a href="${message.file_url}" download="${message.file_name}" 
                class="download-btn text-white hover:text-gray-200 transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-20">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-4-4m4 4l4-4m-6 5a7 7 0 1014 0H5a7 7 0 1114 0z" />
                </svg>
              </a>
            </div>`
          }
          ${message.content ? `<div class="file-caption text-sm italic opacity-90 mt-2">${message.content}</div>` : ''}
        </div>
        <div class="message-meta">
          ${senderName} • ${formatDate(message.created_at)}
        </div>
      </div>`;
    }
    
    // Handle text messages
    return `<div class="message-bubble ${bubbleClass}">
      <div class="message-content">${message.content}</div>
      <div class="message-meta">
        ${senderName} • ${formatDate(message.created_at)}
      </div>
    </div>`;
  }

  // Function to send a text message
  async function sendMessage(e) {
    e.preventDefault();
    
    const content = messageInput.value.trim();
    if (!content) return;
    
    messageInput.value = '';
    
    try {
      const response = await fetch(`/api/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          type: 'text',
          content: content 
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to send message');
      }
      
    } catch (error) {
      alert(`Failed to send message: ${error.message}`);
      messageInput.value = content; // Restore message
    }
  }

  // Function to handle file upload - Telegram style
  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Reset file input
    fileInput.value = '';
    
    try {
      // Show uploading indicator
      const uploadingDiv = document.createElement('div');
      uploadingDiv.className = 'message-bubble outgoing uploading';
      uploadingDiv.innerHTML = `
        <div class="flex items-center space-x-3 p-3 bg-blue-600 bg-opacity-20 rounded-lg">
          <svg class="animate-spin w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <div class="flex-1">
            <div class="font-medium">Uploading ${file.name}</div>
            <div class="text-sm opacity-75">${formatFileSize(file.size)}</div>
          </div>
        </div>
      `;
      messagesContainer.appendChild(uploadingDiv);
      scrollToBottom();
      
      // Upload file to Supabase Storage
      const fileData = await uploadFileToSupabase(file, roomId, token);
      
      // Get caption from user (optional)
      const caption = prompt(`Add a caption for "${file.name}" (optional):`);
      
      // Send file message
      await sendFileMessage(roomId, fileData, caption, token);
      
      // Remove uploading indicator
      uploadingDiv.remove();
      
      // Refresh messages to show the new file
      setTimeout(fetchMessages, 500);
      
    } catch (error) {
      alert(`File upload failed: ${error.message}`);
      
      // Remove uploading indicator if it exists
      const uploadingDiv = messagesContainer.querySelector('.uploading');
      if (uploadingDiv) {
        uploadingDiv.remove();
      }
    }
  }

  // Initialize realtime updates (simple polling for now)
  function initializeRealtime() {
    setInterval(() => {
      fetchMessages();
    }, 3000); // Check every 3 seconds
  }

  // Function to scroll to bottom
  function scrollToBottom() {
    setTimeout(() => {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  }

  // Function to format date
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Function to open members modal
  function openMembersModal() {
    if (!roomData || !roomData.members) return;
    
    const membersHTML = roomData.members.map(member => {
      const isCurrentUser = member.id === user.id;
      const isRoomAdmin = member.id === roomData.admin_id;
      
      return `<div class="member-item flex justify-between items-center p-3 border-b border-gray-200">
        <div>
          <span class="font-medium">${member.username}</span>
          ${isRoomAdmin ? '<span class="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Admin</span>' : ''}
          ${isCurrentUser ? '<span class="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">You</span>' : ''}
        </div>
      </div>`;
    }).join('');
    
    membersList.innerHTML = membersHTML;
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
    if (!confirm('Are you sure you want to leave this room?')) return;
    
    try {
      const response = await fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to leave room');
      }
      
      window.location.href = 'home.html';
      
    } catch (error) {
      alert(`Error leaving room: ${error.message}`);
    }
  }

  // Function to delete room
  async function deleteRoom() {
    if (!isAdmin) {
      alert('Only room admin can delete the room');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${roomData?.name || 'this room'}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete room');
      }
      
      alert('Room deleted successfully');
      window.location.href = 'home.html';
      
    } catch (error) {
      alert(`Error deleting room: ${error.message}`);
    }
  }

  // Function to handle logout
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  }

  // Close modals when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === membersModal) {
      closeMembersModal();
    }
  });
}); 