const { createClient } = require('@supabase/supabase-js');

// Load environment variables if not already loaded by server.js
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  require('dotenv').config();
}

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Create Supabase client
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Check if Supabase is configured and log connection status
if (!supabase) {
  console.error('Supabase not configured. Please check your .env file contains:');
  console.error('- SUPABASE_URL: Your Supabase project URL');
  console.error('- SUPABASE_KEY: Your Supabase anon/service role key');
} else {
  console.log('Supabase client initialized successfully');
}

module.exports = supabase; 