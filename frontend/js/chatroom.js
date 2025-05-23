// Chat room page JavaScript

// Global file viewer function (needs to be accessible from onclick handlers)
window.openFileViewer = function(fileUrl, fileName, fileType, fileSize, canView) {
  console.log(`Opening file viewer for: ${fileName} (${fileType})`);
  console.log(`File URL: ${fileUrl}`);
  console.log(`Can view: ${canView}`);
  
  // Get elements
  const fileViewerModal = document.getElementById('file-viewer-modal');
  const viewerFileName = document.getElementById('viewer-file-name');
  const viewerFileInfo = document.getElementById('viewer-file-info');
  const viewerFileIcon = document.getElementById('viewer-file-icon');
  const viewerDownloadBtn = document.getElementById('viewer-download-btn');
  
  if (!fileViewerModal) {
    console.error('File viewer modal not found');
    return;
  }
  
  // Set basic info
  viewerFileName.textContent = fileName;
  viewerFileInfo.textContent = `${window.formatFileSize(fileSize)} • ${fileType}`;
  viewerFileIcon.innerHTML = window.getFileIcon(fileType);
  viewerDownloadBtn.href = fileUrl;
  viewerDownloadBtn.download = fileName;
  
  // Show modal and loading
  fileViewerModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  showViewerSection('loading');
  
  // Determine viewer type and load content
  if (fileType.startsWith('image/')) {
    console.log('Loading image viewer...');
    loadImageViewer(fileUrl, fileName);
  } else if (fileType === 'application/pdf') {
    console.log('Loading PDF viewer...');
    loadPdfViewer(fileUrl);
  } else if (fileType === 'text/plain' || fileType === 'application/json') {
    console.log('Loading text viewer...');
    loadTextViewer(fileUrl, fileType);
  } else if (fileType.includes('word') || fileType.includes('document')) {
    console.log('Loading document viewer...');
    showViewerSection('document');
    document.getElementById('document-download-btn').href = fileUrl;
    document.getElementById('document-download-btn').download = fileName;
  } else {
    console.log('Loading unsupported viewer...');
    showViewerSection('unsupported');
    document.getElementById('unsupported-download-btn').href = fileUrl;
    document.getElementById('unsupported-download-btn').download = fileName;
  }
};

// Global utility functions
window.formatFileSize = function(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

window.getFileIcon = function(fileType) {
  if (fileType.startsWith('image/')) {
    return `<svg class="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>`;
  } else if (fileType === 'application/pdf') {
    return `<svg class="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>`;
  } else if (fileType.includes('word') || fileType.includes('document')) {
    return `<svg class="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>`;
  } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
    return `<svg class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>`;
  } else if (fileType.includes('zip')) {
    return `<svg class="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>`;
  } else {
    return `<svg class="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>`;
  }
};

// Helper functions for file viewer
window.showViewerSection = function(section) {
  const viewerLoading = document.getElementById('viewer-loading');
  const imageViewer = document.getElementById('image-viewer');
  const pdfViewer = document.getElementById('pdf-viewer');
  const textViewer = document.getElementById('text-viewer');
  const documentViewer = document.getElementById('document-viewer');
  const unsupportedViewer = document.getElementById('unsupported-viewer');
  
  // Hide all viewer sections
  if (viewerLoading) viewerLoading.classList.add('hidden');
  if (imageViewer) imageViewer.classList.add('hidden');
  if (pdfViewer) pdfViewer.classList.add('hidden');
  if (textViewer) textViewer.classList.add('hidden');
  if (documentViewer) documentViewer.classList.add('hidden');
  if (unsupportedViewer) unsupportedViewer.classList.add('hidden');
  
  // Show requested section
  switch (section) {
    case 'loading':
      if (viewerLoading) viewerLoading.classList.remove('hidden');
      break;
    case 'image':
      if (imageViewer) imageViewer.classList.remove('hidden');
      break;
    case 'pdf':
      if (pdfViewer) pdfViewer.classList.remove('hidden');
      break;
    case 'text':
      if (textViewer) textViewer.classList.remove('hidden');
      break;
    case 'document':
      if (documentViewer) documentViewer.classList.remove('hidden');
      break;
    case 'unsupported':
      if (unsupportedViewer) unsupportedViewer.classList.remove('hidden');
      break;
  }
};

window.loadImageViewer = function(imageUrl, imageName) {
  const viewerImage = document.getElementById('viewer-image');
  if (!viewerImage) {
    console.error('viewer-image element not found');
    return;
  }
  
  console.log(`Loading image: ${imageUrl}`);
  
  // Reset any previous transformations
  viewerImage.style.transform = '';
  viewerImage.style.transformOrigin = 'center center';
  
  viewerImage.onload = () => {
    console.log('Image loaded successfully');
    showViewerSection('image');
    
    // Initialize touch gestures after image loads
    initializeTouchGestures(viewerImage);
  };
  
  viewerImage.onerror = (error) => {
    console.error('Failed to load image:', error);
    console.error('Image URL:', imageUrl);
    showViewerSection('unsupported');
  };
  
  viewerImage.src = imageUrl;
  viewerImage.alt = imageName || 'Image preview';
  
  // Preload image for better performance
  const preloadImg = new Image();
  preloadImg.src = imageUrl;
};

// Touch gesture handler for image viewer
function initializeTouchGestures(imageElement) {
  let scale = 1;
  let posX = 0;
  let posY = 0;
  let lastTouchDistance = 0;
  let lastTouchCenter = { x: 0, y: 0 };
  let isDragging = false;
  let lastTouchTime = 0;
  let touchStartPos = { x: 0, y: 0 };
  
  // Touch start handler
  imageElement.addEventListener('touchstart', (e) => {
    e.preventDefault();
    
    const touches = e.touches;
    const currentTime = new Date().getTime();
    
    if (touches.length === 1) {
      // Single touch - prepare for drag or double tap
      const touch = touches[0];
      touchStartPos = { x: touch.clientX, y: touch.clientY };
      
      // Check for double tap
      if (currentTime - lastTouchTime < 300) {
        handleDoubleTap(touch);
      }
      lastTouchTime = currentTime;
      
    } else if (touches.length === 2) {
      // Two fingers - prepare for pinch zoom
      const touch1 = touches[0];
      const touch2 = touches[1];
      
      lastTouchDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      lastTouchCenter = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
    }
  });
  
  // Touch move handler
  imageElement.addEventListener('touchmove', (e) => {
    e.preventDefault();
    
    const touches = e.touches;
    
    if (touches.length === 1 && scale > 1) {
      // Single touch drag when zoomed
      const touch = touches[0];
      const deltaX = touch.clientX - touchStartPos.x;
      const deltaY = touch.clientY - touchStartPos.y;
      
      posX += deltaX * 0.5;
      posY += deltaY * 0.5;
      
      touchStartPos = { x: touch.clientX, y: touch.clientY };
      updateImageTransform();
      
    } else if (touches.length === 2) {
      // Two finger pinch zoom
      const touch1 = touches[0];
      const touch2 = touches[1];
      
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const currentCenter = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
      
      // Calculate scale change
      const scaleChange = currentDistance / lastTouchDistance;
      const newScale = Math.max(0.5, Math.min(scale * scaleChange, 4));
      
      // Calculate position adjustment to zoom towards touch center
      const rect = imageElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const offsetX = currentCenter.x - centerX;
      const offsetY = currentCenter.y - centerY;
      
      posX += offsetX * (scaleChange - 1);
      posY += offsetY * (scaleChange - 1);
      
      scale = newScale;
      lastTouchDistance = currentDistance;
      lastTouchCenter = currentCenter;
      
      updateImageTransform();
    }
  });
  
  // Touch end handler
  imageElement.addEventListener('touchend', (e) => {
    e.preventDefault();
    
    // Reset to center if scale is too small
    if (scale < 0.8) {
      resetImageTransform();
    }
    
    // Constrain position if image is dragged too far
    constrainImagePosition();
  });
  
  // Double tap to zoom
  function handleDoubleTap(touch) {
    if (scale === 1) {
      // Zoom in to 2x
      scale = 2;
      const rect = imageElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      posX = (centerX - touch.clientX) * scale;
      posY = (centerY - touch.clientY) * scale;
    } else {
      // Reset to original size
      resetImageTransform();
    }
    updateImageTransform();
  }
  
  // Update image transformation
  function updateImageTransform() {
    imageElement.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    imageElement.style.transition = 'none';
  }
  
  // Reset image to original state
  function resetImageTransform() {
    scale = 1;
    posX = 0;
    posY = 0;
    imageElement.style.transform = '';
    imageElement.style.transition = 'transform 0.3s ease';
  }
  
  // Constrain image position within bounds
  function constrainImagePosition() {
    const rect = imageElement.getBoundingClientRect();
    const containerRect = imageElement.parentElement.getBoundingClientRect();
    
    const maxX = Math.max(0, (rect.width * scale - containerRect.width) / 2);
    const maxY = Math.max(0, (rect.height * scale - containerRect.height) / 2);
    
    posX = Math.max(-maxX, Math.min(maxX, posX));
    posY = Math.max(-maxY, Math.min(maxY, posY));
    
    imageElement.style.transition = 'transform 0.3s ease';
    updateImageTransform();
  }
  
  // Add swipe-to-close functionality to the modal background
  const modal = document.getElementById('file-viewer-modal');
  let swipeStartY = 0;
  let swipeStartTime = 0;
  
  modal.addEventListener('touchstart', (e) => {
    if (e.target === modal) {
      swipeStartY = e.touches[0].clientY;
      swipeStartTime = new Date().getTime();
    }
  });
  
  modal.addEventListener('touchmove', (e) => {
    if (e.target === modal && e.touches.length === 1) {
      const deltaY = e.touches[0].clientY - swipeStartY;
      const progress = Math.min(Math.abs(deltaY) / 200, 1);
      
      // Fade modal as user swipes
      if (Math.abs(deltaY) > 50) {
        modal.style.backgroundColor = `rgba(0, 0, 0, ${0.75 * (1 - progress)})`;
      }
    }
  });
  
  modal.addEventListener('touchend', (e) => {
    if (e.target === modal) {
      const deltaY = e.changedTouches[0].clientY - swipeStartY;
      const deltaTime = new Date().getTime() - swipeStartTime;
      const velocity = Math.abs(deltaY) / deltaTime;
      
      // Close modal if swiped down significantly or with high velocity
      if (Math.abs(deltaY) > 100 || velocity > 0.5) {
        window.closeFileViewer();
      } else {
        // Reset modal background
        modal.style.backgroundColor = '';
      }
    }
  });
}

window.loadPdfViewer = function(pdfUrl) {
  const viewerPdf = document.getElementById('viewer-pdf');
  if (!viewerPdf) return;
  
  viewerPdf.onload = () => {
    showViewerSection('pdf');
  };
  
  viewerPdf.onerror = () => {
    console.error('Failed to load PDF');
    showViewerSection('unsupported');
  };
  
  viewerPdf.src = `${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`;
};

window.loadTextViewer = async function(textUrl, fileType) {
  try {
    const response = await fetch(textUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const text = await response.text();
    const viewerText = document.getElementById('viewer-text');
    if (!viewerText) return;
    
    // Format based on file type
    if (fileType === 'application/json') {
      try {
        const formatted = JSON.stringify(JSON.parse(text), null, 2);
        viewerText.textContent = formatted;
      } catch (e) {
        viewerText.textContent = text;
      }
    } else {
      viewerText.textContent = text;
    }
    
    showViewerSection('text');
    
  } catch (error) {
    console.error('Failed to load text file:', error);
    showViewerSection('unsupported');
  }
};

// Close file viewer - global function
window.closeFileViewer = function() {
  const fileViewerModal = document.getElementById('file-viewer-modal');
  if (fileViewerModal) {
    fileViewerModal.classList.add('hidden');
    document.body.style.overflow = '';
    
    // Clear viewer content
    const viewerImage = document.getElementById('viewer-image');
    const viewerPdf = document.getElementById('viewer-pdf');
    const viewerText = document.getElementById('viewer-text');
    
    if (viewerImage) viewerImage.src = '';
    if (viewerPdf) viewerPdf.src = '';
    if (viewerText) viewerText.textContent = '';
  }
};

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

  // File upload elements
  const fileUploadButton = document.getElementById('file-upload-button');
  const fileInput = document.getElementById('file-input');
  const filePreview = document.getElementById('file-preview');
  const fileName = document.getElementById('file-name');
  const fileSize = document.getElementById('file-size');
  const fileIcon = document.getElementById('file-icon');
  const removeFileButton = document.getElementById('remove-file');
  const fileCaptionInput = document.getElementById('file-caption');
  const uploadFileButton = document.getElementById('upload-file-button');
  const encryptFileCheckbox = document.getElementById('encrypt-file');

  // File viewer elements
  const fileViewerModal = document.getElementById('file-viewer-modal');
  const closeViewerModal = document.getElementById('close-viewer-modal');
  const viewerFileName = document.getElementById('viewer-file-name');
  const viewerFileInfo = document.getElementById('viewer-file-info');
  const viewerFileIcon = document.getElementById('viewer-file-icon');
  const viewerDownloadBtn = document.getElementById('viewer-download-btn');
  const viewerContent = document.getElementById('viewer-content');
  const viewerLoading = document.getElementById('viewer-loading');
  const imageViewer = document.getElementById('image-viewer');
  const pdfViewer = document.getElementById('pdf-viewer');
  const textViewer = document.getElementById('text-viewer');
  const documentViewer = document.getElementById('document-viewer');
  const unsupportedViewer = document.getElementById('unsupported-viewer');

  // File upload state
  let selectedFile = null;

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

  // File upload event listeners
  fileUploadButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileSelect);
  removeFileButton.addEventListener('click', removeFile);
  uploadFileButton.addEventListener('click', uploadFile);

  // File viewer event listeners
  closeViewerModal.addEventListener('click', window.closeFileViewer);

  // Drag and drop event listeners
  messagesContainer.addEventListener('dragover', handleDragOver);
  messagesContainer.addEventListener('dragenter', handleDragEnter);
  messagesContainer.addEventListener('dragleave', handleDragLeave);
  messagesContainer.addEventListener('drop', handleFileDrop);

  // Event listener for clicking outside the modal to close it
  window.addEventListener('click', (e) => {
    if (e.target === membersModal) {
      closeMembersModal();
    }
    if (e.target === deleteRoomModal) {
      closeDeleteRoomModal();
    }
    if (e.target === fileViewerModal) {
      window.closeFileViewer();
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
    if (!allMessages || allMessages.length === 0) {
      return [];
    }
    
    // If we don't have a lastMessageId, consider all messages as new
    if (!lastMessageId) {
      console.log('No lastMessageId set, treating all messages as new');
      return allMessages;
    }
    
    const lastIndex = allMessages.findIndex(msg => msg.id === lastMessageId);
    
    if (lastIndex === -1) {
      // If last message ID not found, this could mean:
      // 1. Messages were deleted, or 
      // 2. There are newer messages beyond our current view
      // Return all messages as a fallback
      console.log(`Last message ID ${lastMessageId} not found in fetched messages, returning all`);
      return allMessages;
    }
    
    // Return messages after the last known message
    const newerMessages = allMessages.slice(lastIndex + 1);
    console.log(`Found ${newerMessages.length} newer messages after ID ${lastMessageId}`);
    return newerMessages;
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
    initializeLazyLoading();
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
    initializeLazyLoading();
  }

  // Function to create message HTML
  function createMessageHTML(message) {
    const isCurrentUser = message.sender_id === user.id;
    const bubbleClass = isCurrentUser ? 'outgoing' : 'incoming';
    const senderName = isCurrentUser ? 'You' : (message.users?.username || 'Unknown');
    const isTemp = message.id && message.id.toString().startsWith('temp-');
    const statusClass = isTemp ? 'sending' : '';
    
    // Handle file messages with enhanced features
    if (message.message_type === 'file' && message.file_name) {
      const fileIcon = window.getFileIcon(message.file_type);
      const isImage = message.file_type && message.file_type.startsWith('image/');
      const canView = message.supports_inline_view || supportsInlineViewing(message.file_type);
      const hasPreview = message.preview_url;
      const isEncrypted = message.is_encrypted;
      
      // Properly escape parameters for onclick handlers
      const escapedFileName = escapeForJavaScript(message.file_name);
      const escapedFileUrl = escapeForJavaScript(message.file_url);
      const escapedFileType = escapeForJavaScript(message.file_type);
      
      // Generate unique ID for accessibility
      const messageId = `file-message-${message.id}`;
      const imageId = `image-${message.id}`;
      
      return `<div class="message-bubble ${bubbleClass} ${statusClass}" data-message-id="${message.id}">
        <div class="file-message" id="${messageId}">
          ${isImage ? 
            `<div class="image-preview mb-2 relative group">
              <img id="${imageId}"
                data-src="${hasPreview ? message.preview_url : message.file_url}" 
                alt="${escapeHtml(message.file_name)} - Click to view full size" 
                class="max-w-xs max-h-64 rounded-lg cursor-pointer transition-transform hover:scale-105 shadow-md loading" 
                onclick="openFileViewer('${escapedFileUrl}', '${escapedFileName}', '${escapedFileType}', ${message.file_size}, ${canView})"
                role="button"
                tabindex="0"
                onkeydown="if(event.key==='Enter'||event.key===' '){openFileViewer('${escapedFileUrl}', '${escapedFileName}', '${escapedFileType}', ${message.file_size}, ${canView});}"
                loading="lazy"
                style="opacity: 0;">
              ${canView ? `<div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center" aria-hidden="true">
                <svg class="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 6 16 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span class="sr-only">Click to view full size</span>
              </div>` : ''}
            </div>` :
            `<div class="file-info flex items-center space-x-3 mb-2 p-3 bg-white bg-opacity-20 rounded-lg transition-all hover:bg-opacity-30 cursor-pointer"
              onclick="openFileViewer('${escapedFileUrl}', '${escapedFileName}', '${escapedFileType}', ${message.file_size}, ${canView})"
              role="button"
              tabindex="0"
              onkeydown="if(event.key==='Enter'||event.key===' '){openFileViewer('${escapedFileUrl}', '${escapedFileName}', '${escapedFileType}', ${message.file_size}, ${canView});}"
              aria-label="Open ${escapeHtml(message.file_name)} - ${message.file_category || 'file'}">
              <div class="file-icon" aria-hidden="true">${fileIcon}</div>
              <div class="flex-1">
                <div class="file-name font-medium flex items-center">
                  ${escapeHtml(message.file_name)}
                  ${isEncrypted ? '<span class="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded" aria-label="Encrypted file">🔒 Encrypted</span>' : ''}
                </div>
                <div class="file-details text-xs opacity-75 flex items-center space-x-2">
                  <span>${window.formatFileSize(message.file_size || 0)}</span>
                  <span>•</span>
                  <span>${message.file_category || 'file'}</span>
                  ${canView ? '<span>• <span class="text-blue-200">Click to view</span></span>' : ''}
                </div>
              </div>
              <div class="flex space-x-2" role="group" aria-label="File actions">
                ${canView ? `<button class="view-btn text-white hover:text-blue-200 transition-colors" 
                    title="View file" 
                    aria-label="View ${escapeHtml(message.file_name)}"
                    onclick="event.stopPropagation(); openFileViewer('${escapedFileUrl}', '${escapedFileName}', '${escapedFileType}', ${message.file_size}, ${canView});">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 6 16 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>` : ''}
                <a href="${message.file_url}" download="${message.file_name}" 
                  class="download-btn text-white hover:text-gray-200 transition-colors" 
                  onclick="event.stopPropagation()" 
                  title="Download file"
                  aria-label="Download ${escapeHtml(message.file_name)}">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-4-4m4 4l4-4m-6 5a7 7 0 1014 0H5a7 7 0 1114 0z" />
                  </svg>
                </a>
              </div>
            </div>`
          }
          ${message.content ? `<div class="file-caption text-sm italic opacity-90 mt-2">${escapeHtml(message.content)}</div>` : ''}
        </div>
        <div class="message-meta">
          ${senderName} • ${formatDate(message.created_at)}
          ${isCurrentUser && isTemp ? '<span class="sending-indicator" aria-label="Sending">⏳</span>' : ''}
          ${isCurrentUser && !isTemp ? '<span class="sent-indicator" aria-label="Sent">✓</span>' : ''}
        </div>
      </div>`;
    }
    
    // Handle text messages
    return `<div class="message-bubble ${bubbleClass} ${statusClass}" data-message-id="${message.id}">
      <div class="message-content">${escapeHtml(message.content)}</div>
      <div class="message-meta">
        ${senderName} • ${formatDate(message.created_at)}
        ${isCurrentUser && isTemp ? '<span class="sending-indicator" aria-label="Sending">⏳</span>' : ''}
        ${isCurrentUser && !isTemp ? '<span class="sent-indicator" aria-label="Sent">✓</span>' : ''}
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
    // Add temp message to messages array for tracking
    messages.push(tempMessage);
    
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
      
      // Update our messages array - replace the temp message instead of just adding
      const tempIndex = messages.findIndex(msg => msg.id === tempId);
      if (tempIndex !== -1) {
        messages[tempIndex] = realMessage;
      } else {
        messages.push(realMessage);
      }
      
      // Always update lastMessageId to ensure proper tracking
      lastMessageId = realMessage.id;
      
      console.log(`Replaced temp message ${tempId} with real message ${realMessage.id}`);
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

  // === FILE UPLOAD FUNCTIONS ===

  // Handle file selection
  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      if (validateFile(file)) {
        selectedFile = file;
        showFilePreview(file);
      }
    }
  }

  // Handle drag over
  function handleDragOver(event) {
    event.preventDefault();
    messagesContainer.classList.add('drag-over');
  }

  // Handle drag enter
  function handleDragEnter(event) {
    event.preventDefault();
    messagesContainer.classList.add('drag-over');
  }

  // Handle drag leave
  function handleDragLeave(event) {
    event.preventDefault();
    if (!messagesContainer.contains(event.relatedTarget)) {
      messagesContainer.classList.remove('drag-over');
    }
  }

  // Handle file drop
  function handleFileDrop(event) {
    event.preventDefault();
    messagesContainer.classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        selectedFile = file;
        showFilePreview(file);
      }
    }
  }

  // Validate file
  function validateFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return false;
    }
    
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-zip-compressed',
      'application/json'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert('File type not supported. Please upload images, documents, or common file types.');
      return false;
    }
    
    return true;
  }

  // Show file preview
  function showFilePreview(file) {
    fileName.textContent = file.name;
    fileSize.textContent = window.formatFileSize(file.size);
    fileIcon.innerHTML = window.getFileIcon(file.type);
    fileCaptionInput.value = '';
    filePreview.classList.remove('hidden');
    
    // Scroll to show preview
    filePreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Remove file
  function removeFile() {
    selectedFile = null;
    filePreview.classList.add('hidden');
    fileInput.value = '';
  }

  // Upload file with mobile optimization
  async function uploadFile() {
    if (!selectedFile) {
      alert('No file selected');
      return;
    }

    const caption = fileCaptionInput.value.trim();
    const encrypt = encryptFileCheckbox.checked;
    const originalFileName = selectedFile.name;
    
    // Show loading state with progress
    const originalText = uploadFileButton.textContent;
    uploadFileButton.disabled = true;
    uploadFileButton.textContent = 'Optimizing...';

    try {
      // Optimize image for mobile if applicable
      let fileToUpload = selectedFile;
      
      if (selectedFile.type.startsWith('image/')) {
        uploadFileButton.textContent = 'Compressing image...';
        fileToUpload = await optimizeImageForUpload(selectedFile);
        
        if (fileToUpload !== selectedFile) {
          console.log(`Image optimized: ${window.formatFileSize(selectedFile.size)} → ${window.formatFileSize(fileToUpload.size)}`);
        }
      }
      
      uploadFileButton.textContent = 'Uploading...';
      
      const formData = new FormData();
      formData.append('file', fileToUpload);
      if (caption) {
        formData.append('caption', caption);
      }
      if (encrypt) {
        formData.append('encrypt', 'true');
      }

      // Create XMLHttpRequest for upload progress
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          uploadFileButton.textContent = `Uploading... ${percentComplete}%`;
        }
      });
      
      // Handle response
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.message || 'Upload failed'));
            } catch (e) {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        };
        
        xhr.onerror = () => {
          reject(new Error('Network error during upload'));
        };
        
        xhr.ontimeout = () => {
          reject(new Error('Upload timed out'));
        };
      });
      
      // Configure and send request
      xhr.timeout = 60000; // 60 second timeout
      xhr.open('POST', `/api/rooms/${roomId}/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
      
      const data = await uploadPromise;

      if (!data.success) {
        throw new Error(data.message || 'Failed to upload file');
      }

      // File uploaded successfully
      console.log('Enhanced file uploaded:', data.data);
      
      // Clear file preview
      removeFile();
      
      // Show success notification with file size info
      const sizeInfo = fileToUpload !== selectedFile ? 
        ` (optimized from ${window.formatFileSize(selectedFile.size)})` : '';
      showSuccessMessage(`File "${originalFileName}" uploaded successfully!${sizeInfo}`);
      
      // Add haptic feedback on mobile if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      
      // Show user-friendly error messages
      let errorMessage = error.message;
      if (error.message.includes('Network error')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('timed out')) {
        errorMessage = 'Upload timed out. Please try again with a smaller file.';
      }
      
      alert(`Error uploading file: ${errorMessage}`);
      
      // Add error haptic feedback on mobile if available
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } finally {
      // Reset button state
      uploadFileButton.disabled = false;
      uploadFileButton.textContent = originalText;
    }
  }

  // Check if file supports inline viewing
  function supportsInlineViewing(fileType) {
    const viewableTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain', 'application/json'
    ];
    return viewableTypes.includes(fileType);
  }

  // Show success message
  function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message bg-green-100 border border-green-300 text-green-700 text-center py-2 mx-4 my-2 rounded-md';
    successDiv.textContent = message;
    messagesContainer.appendChild(successDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.remove();
      }
    }, 3000);
    
    scrollToBottom();
  }

  // Enhanced lazy loading for file previews with better mobile performance
  function setupLazyLoading() {
    const observerOptions = {
      root: messagesContainer,
      rootMargin: '100px', // Increased for better mobile performance
      threshold: 0.1
    };
    
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            loadImageLazily(img);
            imageObserver.unobserve(img);
          }
        }
      });
    }, observerOptions);
    
    // Observe images with data-src attribute
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
  
  // Enhanced image loading with performance optimization
  function loadImageLazily(img) {
    // Add loading class for animation
    img.classList.add('loading');
    
    // Create new image to preload
    const newImg = new Image();
    
    newImg.onload = () => {
      // Image loaded successfully
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
      img.classList.remove('loading');
      img.classList.add('loaded');
      
      // Add fade-in animation
      requestAnimationFrame(() => {
        img.style.opacity = '1';
      });
    };
    
    newImg.onerror = () => {
      // Image failed to load
      img.classList.remove('loading');
      img.alt = 'Failed to load image';
      img.title = 'Image could not be loaded';
      
      // Show error placeholder
      img.style.background = '#f3f4f6';
      img.style.display = 'flex';
      img.style.alignItems = 'center';
      img.style.justifyContent = 'center';
      img.textContent = '⚠️ Image unavailable';
    };
    
    // Start loading
    newImg.src = img.dataset.src;
  }
  
  // Optimized image upload with compression for mobile
  async function optimizeImageForUpload(file) {
    return new Promise((resolve) => {
      // Skip optimization for non-images or small files
      if (!file.type.startsWith('image/') || file.size < 500000) {
        resolve(file);
        return;
      }
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate optimal dimensions (max 1920x1080 for mobile)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob && blob.size < file.size) {
            // Use compressed version if smaller
            const optimizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(optimizedFile);
          } else {
            // Keep original if compression didn't help
            resolve(file);
          }
        }, 'image/jpeg', 0.85);
      };
      
      img.onerror = () => {
        // If optimization fails, use original
        resolve(file);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  // Open image modal for preview (backward compatibility)
  function openImageModal(imageUrl, imageName) {
    openFileViewer(imageUrl, imageName, 'image/jpeg', 0, true);
  }

  // Helper function to escape HTML but preserve emojis
  function escapeHtml(str) {
    if (!str) return '';
    
    // Create a temporary element to escape HTML
    const div = document.createElement('div');
    div.textContent = str;
    let escaped = div.innerHTML;
    
    // The div.textContent approach preserves emojis naturally
    // No additional processing needed for emoji support
    return escaped;
  }

  // Helper function to format date
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Function to handle logout
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  }

  // Helper function to escape strings for use in JavaScript
  function escapeForJavaScript(str) {
    if (!str) return '';
    
    // Escape special characters that could break JavaScript strings
    return str
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/'/g, "\\'")    // Escape single quotes
      .replace(/"/g, '\\"')    // Escape double quotes
      .replace(/\n/g, '\\n')   // Escape newlines
      .replace(/\r/g, '\\r')   // Escape carriage returns
      .replace(/\t/g, '\\t');  // Escape tabs
  }

  // Initialize lazy loading when messages are displayed
  function initializeLazyLoading() {
    setTimeout(() => {
      setupLazyLoading();
    }, 100);
  }
}); 