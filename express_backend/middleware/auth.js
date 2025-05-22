const { verifyToken } = require('../config/jwt');

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  // Get token from authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. No token provided.' 
    });
  }

  // Verify token
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token.' 
    });
  }

  // Add user info to request
  req.user = { id: decoded.id };
  next();
};

// Middleware to check if user is admin (can be expanded based on your needs)
const isAdmin = (req, res, next) => {
  // This is a placeholder for admin verification
  // In a real app, you'd check if the user has admin privileges
  // For now, we'll keep it simple and just verify they're authenticated
  if (!req.user || !req.user.id) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin privileges required.' 
    });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  isAdmin
}; 