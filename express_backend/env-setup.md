# Environment Setup for Chime with Voice/Video Calling

## Required Environment Variables

Create a `.env` file in the `express_backend` directory with the following variables:

```env
# Database Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT Secret (generate a random 32-character string)
JWT_SECRET=your_super_secret_jwt_key_here

# Agora Configuration for Voice/Video Calls
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# Server Configuration
PORT=3001
NODE_ENV=development

# File Upload Configuration (Optional)
MAX_FILE_SIZE=500000000
SUPABASE_STORAGE_BUCKET=chime-files
```

## Getting Agora Credentials

### Step 1: Create Agora Account
1. Visit [https://www.agora.io](https://www.agora.io)
2. Sign up for a free account
3. Verify your email address

### Step 2: Create Project
1. Go to the Agora Console
2. Click "Create Project"
3. Choose "Secured mode: APP ID + Token (Recommended)"
4. Enter project name: "Chime"
5. Click "Submit"

### Step 3: Get Credentials
1. Copy the **App ID** (32-character string)
2. Click "Generate temp token" to get the **App Certificate**
3. Copy the **App Certificate** (32-character string)

### Step 4: Configure Security (Production)
1. Enable **Token Server** in your project settings
2. Add your domain to the **whitelist**
3. Configure **co-host authentication** if needed

## Testing Configuration

After setting up your `.env` file, test the configuration:

```bash
# Start the server
npm run dev

# Check health endpoint
curl http://localhost:3001/api/health
```

You should see:
```json
{
  "message": "Server is running",
  "callsSupported": true,
  "agoraConfigured": true
}
```

## Troubleshooting

### Issue: `agoraConfigured: false`
**Solution**: Check that `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE` are set correctly in your `.env` file.

### Issue: Calls not connecting
**Solutions**:
1. Verify App ID and Certificate are from the same Agora project
2. Check browser permissions for microphone/camera
3. Ensure HTTPS in production (required for media access)
4. Verify firewall allows WebRTC traffic

### Issue: Token expired errors
**Solution**: Tokens expire after 1 hour by default. The app automatically refreshes tokens, but you can adjust the expiration time in `express_backend/config/agora.js`.

## Security Best Practices

1. **Never commit** your `.env` file to version control
2. Use **different credentials** for development and production
3. Enable **token authentication** in production
4. Set up **domain whitelisting** in Agora Console
5. Monitor **usage and billing** in Agora Console

## Production Deployment

For production deployment, set these environment variables in your hosting platform:

```env
NODE_ENV=production
AGORA_APP_ID=your_production_app_id
AGORA_APP_CERTIFICATE=your_production_certificate
SUPABASE_URL=your_production_supabase_url
JWT_SECRET=your_production_jwt_secret
```

## Free Tier Limits

Agora free tier includes:
- **10,000 minutes/month** for voice calls
- **1,000 minutes/month** for video calls
- **Up to 25 participants** per call
- **Global coverage** and CDN

Perfect for development and small-scale production use! 