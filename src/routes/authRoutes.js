const express = require('express')
const router = express.Router()
const upload = require('../middlewares/upload')
const {
  register,
  login,
  updateProfile,
  verifyOtp,
  getProfile,
  getSuspensionStatus,
  AdminverifyOtp,
  Adminlogin,
} = require('../controllers/authController')
const { getAllsettingImages } = require('../controllers/settingController')

router.post('/register', upload.single('govId'), register)

router.post('/login', login)

router.post('/admin-login', Adminlogin)

router.post('/admin-verify-otp', AdminverifyOtp)

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

// Get suspension status - lightweight endpoint
router.get(
  '/suspension-status',
  require('../middlewares/authMiddleware').authenticate,
  getSuspensionStatus,
)

router.get('/pagesetting', getAllsettingImages)

module.exports = router
