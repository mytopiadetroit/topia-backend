const authService = require('@services/authService')

module.exports = {
  authenticate: (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]
    console.log('token', token)
    if (!token) {
      return res.status(401).json({ message: 'No token provided' })
    }

    try {
      const decoded = authService.verifyToken(token)
      req.user = decoded
      next()
    } catch (error) {
      return res.status(403).json({ message: 'Invalid token' })
    }
  },

  authorizationRole: (...allowedRoles) => {
    return (req, res, next) => {
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
