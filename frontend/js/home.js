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
  const createRoomButton = document.getElementById('create-room-button');
  const createRoomModal = document.getElementById('create-room-modal');
  const closeModalButton = document.getElementById('close-modal-button');
  const createRoomForm = document.getElementById('create-room-form');
  const roomList = document.getElementById('room-list');
  const roomSearch = document.getElementById('room-search');

  // Display username
  usernameDisplay.textContent = user.username;

  // Fetch and display rooms
  fetchRooms();

  // Event listeners
  logoutButton.addEventListener('click', logout);
  createRoomButton.addEventListener('click', openCreateRoomModal);
  closeModalButton.addEventListener('click', closeCreateRoomModal);
  createRoomForm.addEventListener('submit', createRoom);
  roomSearch.addEventListener('input', filterRooms);

  // Event listener for clicking outside the modal to close it
  window.addEventListener('click', (e) => {
    if (e.target === createRoomModal) {
      closeCreateRoomModal();
    }
  });

  // Function to fetch rooms from API
  async function fetchRooms() {
    try {
      roomList.innerHTML = `<div class="flex items-center justify-center p-8 text-gray-500">Loading rooms...</div>`;
      
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
      roomList.innerHTML = `<div class="flex items-center justify-center p-8 text-red-500">
        Error loading rooms: ${error.message}. <button id="retry-fetch" class="ml-2 text-indigo-600 hover:underline">Retry</button>
      </div>`;
      
      document.getElementById('retry-fetch').addEventListener('click', fetchRooms);
    }
  }

  // Function to display rooms
  function displayRooms(rooms) {
    if (!rooms || rooms.length === 0) {
      roomList.innerHTML = `<div class="flex flex-col items-center justify-center p-8 text-gray-500">
        <p>No rooms available.</p>
        <button id="create-first-room" class="mt-2 text-indigo-600 hover:underline">Create your first room</button>
      </div>`;
      
      document.getElementById('create-first-room').addEventListener('click', openCreateRoomModal);
      return;
    }
    
    // Store the original rooms for filtering
    roomList.dataset.rooms = JSON.stringify(rooms);
    
    // Generate HTML for each room
    const roomsHTML = rooms.map(room => {
      const isFull = room.member_count >= room.max_members;
      const badgeClass = isFull ? 'full' : 'available';
      const badgeText = isFull ? 'Full' : 'Available';
      
      return `<div class="room-item p-4 hover:bg-gray-50" data-room-id="${room.id}">
        <div class="flex justify-between items-center">
          <div>
            <h4 class="text-lg font-medium text-gray-900">${room.name}</h4>
            <p class="text-sm text-gray-500">${room.description || 'No description'}</p>
          </div>
          <div class="flex items-center">
            <span class="text-sm text-gray-500 mr-2">${room.member_count}/${room.max_members} members</span>
            <span class="room-item-badge ${badgeClass}">${badgeText}</span>
          </div>
        </div>
        <div class="flex justify-between items-center mt-2">
          <span class="text-sm text-gray-500">Created by ${room.users?.username || 'Unknown'}</span>
          <button class="join-room-button bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-medium py-1 px-3 rounded"
            data-room-id="${room.id}" ${isFull ? 'disabled' : ''}>
            Join Room
          </button>
        </div>
      </div>`;
    }).join('');
    
    roomList.innerHTML = roomsHTML;
    
    // Add event listeners to join buttons
    document.querySelectorAll('.join-room-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const roomId = e.target.dataset.roomId;
        joinRoom(roomId);
      });
    });
  }

  // Function to filter rooms
  function filterRooms() {
    const searchTerm = roomSearch.value.toLowerCase();
    
    // Get original rooms from dataset
    const rooms = JSON.parse(roomList.dataset.rooms || '[]');
    
    if (!searchTerm) {
      displayRooms(rooms);
      return;
    }
    
    // Filter rooms based on search term
    const filteredRooms = rooms.filter(room => 
      room.name.toLowerCase().includes(searchTerm) || 
      (room.description && room.description.toLowerCase().includes(searchTerm))
    );
    
    displayRooms(filteredRooms);
  }

  // Function to create a room
  async function createRoom(e) {
    e.preventDefault();
    
    const roomName = document.getElementById('room-name').value;
    const roomDescription = document.getElementById('room-description').value;
    const maxMembers = document.getElementById('max-members').value;
    
    // Basic validation
    if (!roomName) {
      alert('Please enter a room name');
      return;
    }
    
    if (maxMembers < 1 || maxMembers > 10) {
      alert('Maximum members must be between 1 and 10');
      return;
    }
    
    try {
      // Show loading state
      const submitButton = createRoomForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.textContent;
      submitButton.textContent = 'Creating...';
      submitButton.disabled = true;
      
      // Make API request
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: roomName,
          description: roomDescription,
          maxMembers: parseInt(maxMembers)
        })
      });
      
      const data = await response.json();
      
      // Reset button state
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create room');
      }
      
      // Close modal and reset form
      closeCreateRoomModal();
      createRoomForm.reset();
      
      // Refresh room list
      fetchRooms();
      
    } catch (error) {
      alert(`Error creating room: ${error.message}`);
    }
  }

  // Function to join a room
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
      
      // Redirect to chat room
      window.location.href = `chatroom.html?id=${roomId}`;
      
    } catch (error) {
      alert(`Error joining room: ${error.message}`);
    }
  }

  // Function to open create room modal
  function openCreateRoomModal() {
    createRoomModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
  }

  // Function to close create room modal
  function closeCreateRoomModal() {
    createRoomModal.classList.add('hidden');
    document.body.style.overflow = ''; // Re-enable scrolling
  }

  // Function to handle logout
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  }
}); 