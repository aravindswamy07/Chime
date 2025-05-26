# 🎧 Chime - Complete Communication Platform

A modern, feature-rich chat application with **voice calls**, **video calls**, **screen sharing**, **file uploads**, and **real-time messaging**. Built with Express.js, Supabase, and Agora SDK.

## ✨ Features

### 💬 **Chat & Messaging**
- Real-time messaging with live updates
- File uploads up to 500MB (images, documents, videos)
- File preview and inline viewing
- Message encryption support
- Dark/light theme toggle
- Mobile-responsive design

### 📞 **Voice & Video Calls** (NEW!)
- **Voice calls** for crystal-clear audio communication
- **HD video calls** with adaptive quality
- **Group calls** supporting up to 8 participants
- **Screen sharing** for presentations and collaboration
- **Real-time call controls**: mute, video toggle, end call
- **Call history** and participant management
- **Network quality monitoring** and optimization
- **Cross-platform support** (Web, iOS, Android compatible)

### 🔒 **Advanced Features**
- User authentication and secure sessions
- Room-based conversations with admin controls
- Member management and permissions
- Call recording support (configurable)
- End-to-end encryption for calls
- Low-latency streaming with adaptive bitrate
- Comprehensive error handling and fallback mechanisms

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v16 or higher)
2. **Supabase Account** - [Get one free](https://supabase.com)
3. **Agora Account** - [Sign up here](https://www.agora.io) for voice/video features

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/chime.git
cd chime
```

2. **Install backend dependencies**
```bash
cd express_backend
npm install
```

3. **Set up environment variables**
```bash
# Create .env file in express_backend directory
cp .env.example .env
```

Edit the `.env` file with your credentials:
```env
# Database Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT Secret (generate a random 32-character string)
JWT_SECRET=your_super_secret_jwt_key_here

# Agora Configuration for Calls
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# Server Configuration
PORT=3001
NODE_ENV=development
```

4. **Set up Supabase database**
```bash
# Run the SQL setup script in your Supabase SQL editor
# Copy the contents of supabase_setup.sql and execute it
```

5. **Start the backend server**
```bash
npm run dev
```

6. **Open the frontend**
Open `frontend/index.html` in your browser or serve it with a local web server.

## 🎯 Agora Setup (For Voice/Video Calls)

### Step 1: Create Agora Account
1. Visit [Agora.io](https://www.agora.io) and create a free account
2. Create a new project in the Agora Console
3. Get your **App ID** and **App Certificate**

### Step 2: Configure Security
1. Enable **App Certificate** in your Agora project
2. Add your domain to the **Whitelist** (for production)
3. Configure **Token Server** settings

### Step 3: Update Environment
```env
AGORA_APP_ID=your_32_character_app_id
AGORA_APP_CERTIFICATE=your_32_character_app_certificate
```

### Step 4: Test Integration
```bash
# Check if Agora is configured
curl http://localhost:3001/api/health
# Should return: "agoraConfigured": true
```

## 📱 Usage Guide

### Starting Calls

1. **Voice Call**: Click the green phone icon to start an audio-only call
2. **Video Call**: Click the blue video icon to start a video call with camera
3. **Join Call**: If someone else started a call, click "Join Call" button

### Call Controls

- **🔇 Mute**: Toggle your microphone on/off
- **📷 Video**: Toggle your camera on/off (video calls only)
- **🖥️ Screen Share**: Share your screen with participants
- **👥 Participants**: View list of call participants
- **❌ End Call**: Leave or end the call

### Screen Sharing

1. Click the screen share button during a call
2. Choose which screen/window to share
3. Click "Share" in the browser dialog
4. Other participants will see your shared screen

### File Uploads

1. Click the paperclip icon in the chat
2. Select files up to 500MB
3. Add optional captions
4. Files are stored securely in Supabase Storage

## 🏗️ Architecture

### Backend Stack
- **Express.js** - RESTful API server
- **Supabase** - Database and file storage
- **Agora SDK** - Real-time voice/video communication
- **JWT** - Secure authentication
- **Multer** - File upload handling

### Frontend Stack
- **Vanilla JavaScript** - Clean, dependency-free client
- **Agora Web SDK** - Voice/video call integration
- **Tailwind CSS** - Modern, responsive UI
- **Progressive Enhancement** - Works across all devices

### Database Schema
```sql
-- Core tables
users (id, username, email, created_at)
chat_rooms (id, name, description, admin_id, max_members)
messages (id, room_id, sender_id, content, file_url, message_type)

-- Call system tables
call_sessions (id, agora_channel_name, room_id, call_type, status)
call_participants (id, call_session_id, user_id, is_muted, is_video_enabled)
call_events (id, call_session_id, event_type, event_data)
```

## 🔧 Advanced Configuration

### Call Quality Settings
```javascript
// Automatically adjusts based on network conditions
const qualitySettings = {
  excellent: { video: '720p@30fps', audio: '128kbps' },
  good: { video: '480p@24fps', audio: '64kbps' },
  poor: { video: '240p@10fps', audio: '32kbps' }
};
```

### File Upload Limits
```javascript
// Configurable in messageController.js
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const SUPPORTED_TYPES = ['image/*', 'video/*', 'application/pdf', ...];
```

### Call Recording (Optional)
```env
# Enable call recording
AGORA_RECORDING_ENABLED=true
AGORA_RECORDING_BUCKET=your_storage_bucket
```

## 🚀 Deployment

### Vercel Deployment (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy backend
cd express_backend
vercel

# Deploy frontend
cd ../frontend
vercel
```

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL=your_production_supabase_url
AGORA_APP_ID=your_production_agora_app_id
AGORA_APP_CERTIFICATE=your_production_app_certificate
```

## 🛠️ Development

### Running Tests
```bash
cd express_backend
npm test
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=chime:* npm run dev
```

### Performance Monitoring
```bash
# Monitor call quality
curl http://localhost:3001/api/call/analytics
```

## 🔒 Security Features

- **End-to-End Encryption** for all calls
- **JWT Authentication** with secure token refresh
- **Rate Limiting** to prevent abuse
- **Input Validation** and sanitization
- **CORS Protection** with whitelist domains
- **File Type Validation** and virus scanning

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📋 API Documentation

### Call Endpoints
```
POST /api/rooms/:roomId/call/initiate - Start a new call
POST /api/call/:sessionId/join - Join existing call
POST /api/call/:sessionId/leave - Leave call
POST /api/call/:sessionId/end - End call (admin only)
GET /api/call/:sessionId/status - Get call status
PATCH /api/call/:sessionId/participant - Update participant status
```

### Message Endpoints
```
GET /api/rooms/:roomId/messages - Get room messages
POST /api/rooms/:roomId/messages - Send message
POST /api/upload/file - Upload file to Supabase
```

## 🐛 Troubleshooting

### Common Issues

**Calls not working:**
```bash
# Check Agora configuration
curl http://localhost:3001/api/health

# Verify environment variables
echo $AGORA_APP_ID
echo $AGORA_APP_CERTIFICATE
```

**Permission errors:**
- Ensure microphone/camera permissions are granted
- Check browser compatibility (Chrome, Firefox, Safari, Edge)
- Verify HTTPS in production (required for media access)

**File upload failures:**
- Check file size (max 500MB)
- Verify Supabase storage bucket permissions
- Ensure proper CORS settings

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/chime/issues)
- **Documentation**: [Wiki](https://github.com/yourusername/chime/wiki)
- **Discord**: [Community Server](https://discord.gg/your-server)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Agora.io](https://www.agora.io) for excellent WebRTC infrastructure
- [Supabase](https://supabase.com) for backend-as-a-service
- [Tailwind CSS](https://tailwindcss.com) for beautiful styling
- The open-source community for inspiration and contributions

---

**Built with ❤️ for seamless communication** 