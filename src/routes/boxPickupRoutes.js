const express = require('express')
const router = express.Router()
const {
  createBoxPickup,
  getBoxPickups,
  getUserBoxHistory,
  markBoxPickup,
  updateBoxPickup
} = require('../controllers/boxPickupController')
const { authenticate, authorizationRole } = require('../middlewares/authMiddleware')

router.post('/', authenticate, authorizationRole('admin'), createBoxPickup)
router.get('/', authenticate, authorizationRole('admin'), getBoxPickups)
router.get('/user/:userId', authenticate, authorizationRole('admin'), getUserBoxHistory)
router.put('/:id/status', authenticate, authorizationRole('admin'), markBoxPickup)
router.put('/:id', authenticate, authorizationRole('admin'), updateBoxPickup)

module.exports = router
