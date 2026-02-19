const express = require('express')
const router = express.Router()
const {
  requestChange,
  getPendingChanges,
  getUserPendingChanges,
  reviewChange
} = require('../controllers/pendingChangeController')
const { authenticate, authorizationRole } = require('../middlewares/authMiddleware')

router.post('/', authenticate, requestChange)
router.get('/my-requests', authenticate, getUserPendingChanges)
router.get('/admin/all', authenticate, authorizationRole('admin'), getPendingChanges)
router.put('/admin/:id/review', authenticate, authorizationRole('admin'), reviewChange)

module.exports = router
