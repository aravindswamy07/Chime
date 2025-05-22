// Home page JavaScript

document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token || !user.id) {
    window.location.href = 'index.html';
    return;
  }

  // DOM elements
  const usernameDisplay = document.getElementById('username-display');
  const logoutButton = document.getElementById('logout-button');
  const roomsContainer = document.getElementById('rooms-container');
  const createRoomModal = document.getElementById('create-room-modal');
  const joinRoomModal = document.getElementById('join-room-modal');
  const createRoomButton = document.getElementById('create-room-button');
  const joinRoomButton = document.getElementById('join-room-button');
  const closeCreateModalButton = document.getElementById('close-create-modal-button');
  const closeJoinModalButton = document.getElementById('close-join-modal-button');
  const createRoomForm = document.getElementById('create-room-form');
  const joinRoomForm = document.getElementById('join-room-form');

  // Display username
  usernameDisplay.textContent = user.username;

  // Event listeners
  logoutButton.addEventListener('click', logout);
  createRoomButton.addEventListener('click', openCreateRoomModal);
  joinRoomButton.addEventListener('click', openJoinRoomModal);
  closeCreateModalButton.addEventListener('click', closeCreateRoomModal);
  closeJoinModalButton.addEventListener('click', closeJoinRoomModal);
  createRoomForm.addEventListener('submit', createRoom);
  joinRoomForm.addEventListener('submit', joinRoomByCode);

  // Event listeners for clicking outside modals to close them
  window.addEventListener('click', (e) => {
    if (e.target === createRoomModal) {
      closeCreateRoomModal();
    }
    if (e.target === joinRoomModal) {
      closeJoinRoomModal();
    }
  });

  // Fetch and display rooms
  fetchRooms();

  // Function to fetch rooms
  async function fetchRooms() {
    try {
      roomsContainer.innerHTML = `<div class="flex items-center justify-center py-12">
        <div class="text-gray-500">Loading rooms...</div>
      </div>`;
      
      const response = await fetch('/api/rooms', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch rooms');
      }
      
      displayRooms(data.data);
      
    } catch (error) {
      roomsContainer.innerHTML = `<div class="flex flex-col items-center justify-center py-12">
        <div class="text-red-500 mb-4">Error loading rooms: ${error.message}</div>
        <button id="retry-fetch" class="text-indigo-600 hover:underline">Retry</button>
      </div>`;
      
      document.getElementById('retry-fetch').addEventListener('click', fetchRooms);
    }
  }

  // Function to display rooms
  function displayRooms(rooms) {
    if (!rooms || rooms.length === 0) {
      roomsContainer.innerHTML = `<div class="text-center py-12">
        <div class="text-gray-500 mb-4">No rooms available</div>
        <p class="text-sm text-gray-400">Create a room or ask for a room code to join one!</p>
      </div>`;
      return;
    }
    
    const roomsHTML = rooms.map(room => {
      const isCreator = room.admin_id === user.id;
      const memberText = room.current_members ? `${room.current_members}/${room.max_members}` : `0/${room.max_members}`;
      
      return `
        <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div class="flex justify-between items-start mb-4">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">${escapeHtml(room.name)}</h3>
              <p class="text-gray-600 text-sm mb-3">${escapeHtml(room.description || 'No description')}</p>
              
              <div class="flex items-center text-sm text-gray-500 space-x-4">
                <span>👥 ${memberText} members</span>
                <span>👑 ${escapeHtml(room.users?.username || 'Unknown')}</span>
              </div>
            </div>
          </div>
          
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <button class="join-room-btn bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                      data-room-id="${room.id}">
                Enter Room
              </button>
              
              ${isCreator ? `
                <button class="show-room-code-btn bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                        data-room-id="${room.id}">
                  Show Code
                </button>
              ` : ''}
            </div>
            
            <div class="text-xs text-gray-400">
              Created ${formatDate(room.created_at)}
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    roomsContainer.innerHTML = roomsHTML;
    
    // Add event listeners to join buttons
    document.querySelectorAll('.join-room-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const roomId = e.target.dataset.roomId;
        joinRoom(roomId);
      });
    });
    
    // Add event listeners to show code buttons
    document.querySelectorAll('.show-room-code-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const roomId = e.target.dataset.roomId;
        showRoomCode(roomId);
      });
    });
  }

  // Function to show room code
  async function showRoomCode(roomId) {
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
      
      const roomCode = data.data.room_code;
      
      if (roomCode) {
        // Show room code in a nice modal or alert
        const codeModal = `
          <div id="room-code-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div class="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
              <div class="text-center">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Room Code</h3>
                <div class="bg-gray-100 rounded-lg p-6 mb-6">
                  <div class="text-3xl font-mono font-bold text-indigo-600 tracking-wider">${roomCode}</div>
                </div>
                <p class="text-sm text-gray-600 mb-6">Share this code with others to let them join your room</p>
                <div class="flex space-x-3">
                  <button id="copy-code-btn" class="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors">
                    Copy Code
                  </button>
                  <button id="close-code-modal-btn" class="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 transition-colors">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', codeModal);
        
        // Add event listeners
        document.getElementById('copy-code-btn').addEventListener('click', () => {
          navigator.clipboard.writeText(roomCode).then(() => {
            document.getElementById('copy-code-btn').textContent = 'Copied!';
            setTimeout(() => {
              const btn = document.getElementById('copy-code-btn');
              if (btn) btn.textContent = 'Copy Code';
            }, 2000);
          });
        });
        
        document.getElementById('close-code-modal-btn').addEventListener('click', () => {
          document.getElementById('room-code-modal').remove();
        });
      } else {
        alert('You are not the admin of this room');
      }
      
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }

  // Function to join room by room code
  async function joinRoomByCode(e) {
    e.preventDefault();
    
    const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
    
    if (!roomCode) {
      alert('Please enter a room code');
      return;
    }
    
    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roomCode })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to join room');
      }
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to join room');
      }
      
      closeJoinRoomModal();
      
      // Show success message
      if (data.alreadyMember) {
        alert(data.message);
      } else {
        alert('Successfully joined the room!');
      }
      
      // Redirect to the room
      window.location.href = `chatroom.html?id=${data.roomId}`;
      
    } catch (error) {
      alert(`Error joining room: ${error.message}`);
    }
  }

  // Function to join room directly (for rooms the user can see)
  async function joinRoom(roomId) {
    try {
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to join room');
      }
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to join room');
      }
      
      // Redirect to the room
      window.location.href = `chatroom.html?id=${roomId}`;
      
    } catch (error) {
      alert(`Error joining room: ${error.message}`);
    }
  }

  // Function to create room
  async function createRoom(e) {
    e.preventDefault();
    
    const name = document.getElementById('room-name').value.trim();
    const description = document.getElementById('room-description').value.trim();
    const maxMembers = parseInt(document.getElementById('max-members').value) || 10;
    
    if (!name) {
      alert('Please enter a room name');
      return;
    }
    
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, description, maxMembers })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create room');
      }
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create room');
      }
      
      closeCreateRoomModal();
      
      // Show success message with room code
      const roomCode = data.data.room_code;
      alert(`Room created successfully!\n\nYour room code is: ${roomCode}\n\nShare this code with others to let them join your room.`);
      
      // Refresh the rooms list
      fetchRooms();
      
    } catch (error) {
      alert(`Error creating room: ${error.message}`);
    }
  }

  // Modal functions
  function openCreateRoomModal() {
    createRoomModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    // Reset form
    createRoomForm.reset();
  }

  function closeCreateRoomModal() {
    createRoomModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function openJoinRoomModal() {
    joinRoomModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    // Reset form
    joinRoomForm.reset();
    // Focus on the room code input
    setTimeout(() => {
      document.getElementById('room-code-input').focus();
    }, 100);
  }

  function closeJoinRoomModal() {
    joinRoomModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // Helper function to format date
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
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