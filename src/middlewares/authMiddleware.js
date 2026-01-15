const authService = require('@services/authService')

module.exports = {
  authenticate: (req, res, next) => {
    // Try multiple token formats
    let token = req.headers['authorization']?.split(' ')[1]; // Bearer token
    
    if (!token) {
      // Try jwt format
      token = req.headers['authorization']?.replace('jwt ', '');
    }
    
    console.log('Auth token:', token ? 'Present' : 'Missing');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' })
    }

    try {
      const decoded = authService.verifyToken(token)
      req.user = decoded
      console.log('User authenticated:', decoded.id, decoded.role);
      next()
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return res.status(403).json({ message: 'Invalid token' })
    }
  },

  authorizationRole: (...allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        })
      }
      
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access Denied: Role ${req.user.role} is not allowed to access this resource`,
        })
      }
      next()
    }
  },
}
