const express = require('express')
const router = express.Router()
const {
  createSubscriber,
  getSubscribers,
} = require('../controllers/subscriberController')
const authMiddleware = require('../middlewares/authMiddleware')

// Public: subscribe via website footer
router.post('/', createSubscriber)

// Admin: list subscribers (optional auth)
// Uncomment the next line to require admin auth when ready
// router.get('/', authMiddleware.authenticate, authMiddleware.authorizationRole('admin'), getSubscribers);
router.get('/', getSubscribers)

module.exports = router
