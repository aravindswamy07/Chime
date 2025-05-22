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

  // Function to fetch rooms (only rooms user is a member of)
  async function fetchRooms() {
    try {
      roomsContainer.innerHTML = `<div class="flex items-center justify-center py-12 col-span-full">
        <div class="text-gray-500">Loading your rooms...</div>
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
      roomsContainer.innerHTML = `<div class="flex flex-col items-center justify-center py-12 col-span-full">
        <div class="text-red-500 mb-4">Error loading rooms: ${error.message}</div>
        <button id="retry-fetch" class="text-indigo-600 hover:underline">Retry</button>
      </div>`;
      
      document.getElementById('retry-fetch').addEventListener('click', fetchRooms);
    }
  }

  // Function to display rooms (only rooms user is a member of)
  function displayRooms(rooms) {
    if (!rooms || rooms.length === 0) {
      roomsContainer.innerHTML = `<div class="text-center py-12 col-span-full">
        <div class="text-gray-500 mb-4">You haven't joined any rooms yet</div>
        <p class="text-sm text-gray-400 mb-6">Create your own room or join one using a room code!</p>
        <div class="flex justify-center space-x-4">
          <button onclick="document.getElementById('join-room-button').click()" 
                  class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium">
            Join Room
          </button>
          <button onclick="document.getElementById('create-room-button').click()" 
                  class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium">
            Create Room
          </button>
        </div>
      </div>`;
      return;
    }
    
    const roomsHTML = rooms.map(room => {
      const isCreator = room.admin_id === user.id;
      const memberText = `${room.current_members}/${room.max_members}`;
      
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
              
              ${isCreator ? `
                <div class="mt-3 text-xs text-gray-500">
                  Room ID: <span class="font-mono font-semibold">${room.id}</span>
                </div>
              ` : ''}
            </div>
          </div>
          
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <button class="enter-room-btn bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                      data-room-id="${room.id}">
                Enter Chat
              </button>
              
              ${isCreator ? `
                <button class="show-room-code-btn bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                        data-room-id="${room.id}">
                  Share Code
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
    
    // Add event listeners to enter room buttons
    document.querySelectorAll('.enter-room-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const roomId = e.target.dataset.roomId;
        // Directly navigate to chat room since user is already a member
        window.location.href = `chatroom.html?id=${roomId}`;
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

  // Function to show room code and ID
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
      const roomName = data.data.name;
      
      if (roomCode) {
        // Show room ID and code in a nice modal
        const codeModal = `
          <div id="room-code-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div class="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
              <div class="text-center">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Room Details</h3>
                <div class="text-sm font-medium text-gray-700 mb-2">${escapeHtml(roomName)}</div>
                
                <div class="space-y-4 mb-6">
                  <div class="bg-gray-50 rounded-lg p-4">
                    <div class="text-sm text-gray-600 mb-1">Room ID</div>
                    <div class="text-lg font-mono font-bold text-gray-800">${roomId}</div>
                  </div>
                  
                  <div class="bg-indigo-50 rounded-lg p-4">
                    <div class="text-sm text-indigo-600 mb-1">Room Code</div>
                    <div class="text-3xl font-mono font-bold text-indigo-600 tracking-wider">${roomCode}</div>
                  </div>
                </div>
                
                <p class="text-sm text-gray-600 mb-6">Share the Room Code with others to let them join your room</p>
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
      
      // Show success message with room name
      if (data.alreadyMember) {
        alert(`${data.message}\n\nRoom: ${data.roomName}`);
      } else {
        alert(`Successfully joined "${data.roomName}"!`);
        // Refresh the rooms list to show the new room
        fetchRooms();
      }
      
      // Redirect to the room
      window.location.href = `chatroom.html?id=${data.roomId}`;
      
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
      
      // Show success message with room ID and code
      const roomId = data.data.roomId;
      const roomCode = data.data.roomCode;
      
      const successModal = `
        <div id="success-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div class="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div class="text-center">
              <div class="text-green-600 text-4xl mb-4">✅</div>
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Room Created Successfully!</h3>
              <div class="text-sm font-medium text-gray-700 mb-4">"${escapeHtml(name)}"</div>
              
              <div class="space-y-4 mb-6">
                <div class="bg-gray-50 rounded-lg p-4">
                  <div class="text-sm text-gray-600 mb-1">Room ID</div>
                  <div class="text-lg font-mono font-bold text-gray-800">${roomId}</div>
                </div>
                
                <div class="bg-green-50 rounded-lg p-4">
                  <div class="text-sm text-green-600 mb-1">Room Code</div>
                  <div class="text-3xl font-mono font-bold text-green-600 tracking-wider">${roomCode}</div>
                </div>
              </div>
              
              <p class="text-sm text-gray-600 mb-6">Share the Room Code with others to let them join your room</p>
              <div class="flex space-x-3">
                <button id="copy-room-code-btn" class="flex-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors">
                  Copy Code
                </button>
                <button id="enter-room-btn" class="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors">
                  Enter Room
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', successModal);
      
      // Add event listeners
      document.getElementById('copy-room-code-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(roomCode).then(() => {
          document.getElementById('copy-room-code-btn').textContent = 'Copied!';
          setTimeout(() => {
            const btn = document.getElementById('copy-room-code-btn');
            if (btn) btn.textContent = 'Copy Code';
          }, 2000);
        });
      });
      
      document.getElementById('enter-room-btn').addEventListener('click', () => {
        document.getElementById('success-modal').remove();
        window.location.href = `chatroom.html?id=${roomId}`;
      });
      
      // Auto close after 10 seconds
      setTimeout(() => {
        const modal = document.getElementById('success-modal');
        if (modal) {
          modal.remove();
          // Refresh the rooms list
          fetchRooms();
        }
      }, 10000);
      
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