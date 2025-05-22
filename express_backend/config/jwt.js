const jwt = require('jsonwebtoken');

// Get JWT settings from environment variables or use defaults
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_for_development_only';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h'; // Default to 24 hours

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY
  });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  JWT_SECRET
}; 