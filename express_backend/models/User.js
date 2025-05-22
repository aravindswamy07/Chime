const supabase = require('../config/db');
const bcrypt = require('bcryptjs');

// User Model - interacts with Supabase
class User {
  // Find user by email
  static async findByEmail(email) {
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
    
    return data;
  }
  
  // Find user by ID
  static async findById(id) {
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error finding user by id:', error);
      return null;
    }
    
    return data;
  }
  
  // Create a new user
  static async create(userData) {
    if (!supabase) {
      console.error('Supabase client not initialized - check environment variables');
      return null;
    }
    
    try {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Log connection attempt
      console.log('Attempting to connect to Supabase with URL:', process.env.SUPABASE_URL ? 'URL exists' : 'URL missing');
      
      // Create user in Supabase
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            username: userData.username,
            email: userData.email,
            password: hashedPassword
          }
        ])
        .select();
      
      if (error) {
        console.error('Detailed error creating user:', error.message, error.details, error.hint);
        return null;
      }
      
      return data[0];
    } catch (error) {
      console.error('Exception in create user:', error.message, error.stack);
      return null;
    }
  }
  
  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = User; 