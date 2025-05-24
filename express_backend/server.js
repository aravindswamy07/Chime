require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const authRoutes = require('./routes/authRoutes');
const chatRoomRoutes = require('./routes/chatRoomRoutes');
const messageRoutes = require('./routes/messageRoutes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Enhanced middleware with Vercel-compatible limits
app.use(cors());

// Reduced payload limits for Vercel serverless compatibility
app.use(express.json({ 
  limit: '4mb',  // Reduced for Vercel compatibility
  parameterLimit: 5000,
  extended: true
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '4mb',  // Reduced for Vercel compatibility
  parameterLimit: 5000
}));

// Enhanced timeout middleware for large file operations
app.use((req, res, next) => {
  // Set longer timeout for upload routes (30 minutes)
  if (req.path.includes('/upload')) {
    req.setTimeout(30 * 60 * 1000); // 30 minutes
    res.setTimeout(30 * 60 * 1000); // 30 minutes
  } else {
    // Standard timeout for other routes (5 minutes)
    req.setTimeout(5 * 60 * 1000);
    res.setTimeout(5 * 60 * 1000);
  }
  next();
});

// Ensure UTF-8 encoding for all text responses
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Route middleware
app.use('/api/auth', authRoutes);
app.use('/api/rooms', chatRoomRoutes);
app.use('/api', messageRoutes);

// Test route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    message: 'Server is running',
    maxPayload: '50mb',
    uploadTimeout: '30 minutes',
    chunkedUploadSupported: true
  });
});

// Enhanced error handling middleware for upload operations
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  
  // Handle specific upload-related errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File too large. Maximum size is 120MB.'
    });
  }
  
  if (err.code === 'LIMIT_FIELD_VALUE') {
    return res.status(413).json({
      success: false,
      message: 'Form data too large.'
    });
  }
  
  if (err.message && err.message.includes('timeout')) {
    return res.status(408).json({
      success: false,
      message: 'Upload timed out. Please try again with a smaller file or better connection.'
    });
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    message: 'Something went wrong on the server'
  });
});

// Start server with enhanced configuration
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Chime server running on port ${PORT}`);
    console.log(`📁 Max file size: 120MB`);
    console.log(`⏱️  Upload timeout: 30 minutes`);
    console.log(`🔧 Chunked uploads: Enabled`);
    console.log(`📱 Mobile optimization: Enabled`);
  });
  
  // Set server timeout for long-running uploads
  server.timeout = 30 * 60 * 1000; // 30 minutes
  server.keepAliveTimeout = 60 * 1000; // 60 seconds
  server.headersTimeout = 65 * 1000; // 65 seconds
}

module.exports = app; // For testing purposes 