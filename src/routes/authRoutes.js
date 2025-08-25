const express = require('express')
const router = express.Router()
const upload = require('../middlewares/upload')
const {
  register,
  login,
  updateProfile,
  verifyOtp,
  getProfile,
} = require('../controllers/authController')

router.post('/register', upload.single('govId'), register)

router.post('/login', login)

router.post('/verify-otp', verifyOtp)

// Setup multer fields for multiple file types
const uploadFields = upload.fields([
  { name: 'govId', maxCount: 1 },
  { name: 'avatar', maxCount: 1 },
])

router.put('/profile/:id', uploadFields, updateProfile)

// Get user profile
router.get(
  '/profile',
  require('../middlewares/authMiddleware').authenticate,
  getProfile,
)

module.exports = router
